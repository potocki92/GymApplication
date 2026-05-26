import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getSupabaseEnv } from "../helpers/env";

const { url: URL, key: KEY, configured: hasCreds } = getSupabaseEnv();

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function freshClient() {
  return createClient(URL, KEY, { auth: { persistSession: false } });
}

async function signUpFresh() {
  const client = freshClient();
  const email = uniqueEmail();
  const password = "Pa55w0rd-e2e-x";
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  if (!data.session) {
    throw new Error("signUp returned no session — is 'Confirm email' off?");
  }
  return { client, email, password, userId: data.user!.id };
}

describe.skipIf(!hasCreds)("Supabase persistence (RLS round-trip)", () => {
  it("signup auto-confirms and trigger seeds a profile row", async () => {
    const { client, email, userId } = await signUpFresh();
    const { data, error } = await client
      .from("profiles")
      .select("id,email")
      .eq("id", userId)
      .single();
    expect(error, error?.message).toBeNull();
    expect(data).toEqual({ id: userId, email });
  }, 30_000);

  it("workout + exercises survive a fresh re-login", async () => {
    const { email, password, userId } = await signUpFresh();

    const writer = freshClient();
    const writerLogin = await writer.auth.signInWithPassword({ email, password });
    expect(writerLogin.error, writerLogin.error?.message).toBeNull();

    const workoutId = uniqueId("w");
    const exerciseRowId = uniqueId("we");

    const wIns = await writer.from("workouts").insert({
      id: workoutId,
      user_id: userId,
      weekday: "tuesday",
      rest: false,
      name: "E2E Push",
      type: "push",
      estimated_duration_min: 45,
      completed: false,
    });
    expect(wIns.error, wIns.error?.message).toBeNull();

    const eIns = await writer.from("workout_exercises").insert({
      id: exerciseRowId,
      workout_id: workoutId,
      user_id: userId,
      order_index: 0,
      exercise_id: "bench-press",
      sets: 3,
      reps: "8-10",
      weight_kg: 60,
      rest_sec: 90,
    });
    expect(eIns.error, eIns.error?.message).toBeNull();

    // Simulate a hard page reload: new client, sign in again from scratch.
    const reader = freshClient();
    const readerLogin = await reader.auth.signInWithPassword({ email, password });
    expect(readerLogin.error).toBeNull();

    const { data: workouts, error: wReadErr } = await reader
      .from("workouts")
      .select("id,name,weekday,type,estimated_duration_min,completed,rest")
      .eq("user_id", userId);
    expect(wReadErr).toBeNull();
    expect(workouts).toHaveLength(1);
    expect(workouts![0]).toMatchObject({
      id: workoutId,
      name: "E2E Push",
      weekday: "tuesday",
      type: "push",
      estimated_duration_min: 45,
      completed: false,
      rest: false,
    });

    const { data: exercises } = await reader
      .from("workout_exercises")
      .select("id,workout_id,exercise_id,sets,reps,weight_kg,rest_sec,order_index")
      .eq("workout_id", workoutId);
    expect(exercises).toHaveLength(1);
    expect(exercises![0]).toMatchObject({
      id: exerciseRowId,
      workout_id: workoutId,
      exercise_id: "bench-press",
      sets: 3,
      reps: "8-10",
      rest_sec: 90,
      order_index: 0,
    });
    expect(Number(exercises![0].weight_kg)).toBe(60);
  }, 30_000);

  it("body_metrics row survives a fresh re-login", async () => {
    const { email, password, userId } = await signUpFresh();

    const writer = freshClient();
    await writer.auth.signInWithPassword({ email, password });

    const rowId = uniqueId("m");
    const today = new Date().toISOString().slice(0, 10);
    const ins = await writer.from("body_metrics").insert({
      id: rowId,
      user_id: userId,
      date: today,
      weight_kg: 82.4,
      waist_cm: 84,
      notes: "morning",
    });
    expect(ins.error, ins.error?.message).toBeNull();

    const reader = freshClient();
    await reader.auth.signInWithPassword({ email, password });
    const { data, error } = await reader
      .from("body_metrics")
      .select("id,date,weight_kg,waist_cm,notes")
      .eq("user_id", userId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ id: rowId, date: today, notes: "morning" });
    expect(Number(data![0].weight_kg)).toBe(82.4);
    expect(Number(data![0].waist_cm)).toBe(84);
  }, 30_000);

  it("exercise_history row survives a fresh re-login", async () => {
    const { email, password, userId } = await signUpFresh();

    const writer = freshClient();
    await writer.auth.signInWithPassword({ email, password });

    const rowId = uniqueId("h");
    const sessionId = uniqueId("s");
    const completedAt = new Date().toISOString();
    const ins = await writer.from("exercise_history").insert({
      id: rowId,
      user_id: userId,
      exercise_id: "bench-press",
      workout_id: "w-monday",
      session_id: sessionId,
      set_number: 1,
      reps: 8,
      weight_kg: 70,
      one_rm_kg: 88,
      completed_at: completedAt,
    });
    expect(ins.error, ins.error?.message).toBeNull();

    const reader = freshClient();
    await reader.auth.signInWithPassword({ email, password });
    const { data, error } = await reader
      .from("exercise_history")
      .select("id,exercise_id,session_id,set_number,reps,weight_kg,one_rm_kg")
      .eq("user_id", userId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      id: rowId,
      exercise_id: "bench-press",
      session_id: sessionId,
      set_number: 1,
      reps: 8,
    });
    expect(Number(data![0].weight_kg)).toBe(70);
    expect(Number(data![0].one_rm_kg)).toBe(88);
  }, 30_000);

  it("RLS blocks reads of another user's workouts", async () => {
    const alice = await signUpFresh();
    const bob = await signUpFresh();

    const aliceClient = freshClient();
    await aliceClient.auth.signInWithPassword({
      email: alice.email,
      password: alice.password,
    });

    const workoutId = uniqueId("w-alice");
    const ins = await aliceClient.from("workouts").insert({
      id: workoutId,
      user_id: alice.userId,
      weekday: "wednesday",
      rest: false,
      name: "alice-only",
      estimated_duration_min: 30,
    });
    expect(ins.error).toBeNull();

    const bobClient = freshClient();
    await bobClient.auth.signInWithPassword({
      email: bob.email,
      password: bob.password,
    });
    const { data, error } = await bobClient
      .from("workouts")
      .select("*")
      .eq("id", workoutId);
    // RLS hides rows rather than erroring — an empty array is the expected proof.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, 45_000);
});
