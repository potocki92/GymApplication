import { describe, expect, it } from "vitest";

import { pluralPl } from "@/lib/i18n/plural";

const forms = { one: "ćwiczenie", few: "ćwiczenia", many: "ćwiczeń" };

describe("pluralPl", () => {
  it("uses the singular form for exactly one", () => {
    expect(pluralPl(1, forms)).toBe("ćwiczenie");
  });

  it("uses the few form for 2-4", () => {
    expect(pluralPl(2, forms)).toBe("ćwiczenia");
    expect(pluralPl(3, forms)).toBe("ćwiczenia");
    expect(pluralPl(4, forms)).toBe("ćwiczenia");
  });

  it("uses the many form for 0 and 5+", () => {
    expect(pluralPl(0, forms)).toBe("ćwiczeń");
    expect(pluralPl(5, forms)).toBe("ćwiczeń");
    expect(pluralPl(11, forms)).toBe("ćwiczeń");
  });

  it("uses the many form for the teens (12-14)", () => {
    expect(pluralPl(12, forms)).toBe("ćwiczeń");
    expect(pluralPl(13, forms)).toBe("ćwiczeń");
    expect(pluralPl(14, forms)).toBe("ćwiczeń");
  });

  it("uses the few form for compound 2-4 endings outside the teens", () => {
    expect(pluralPl(22, forms)).toBe("ćwiczenia");
    expect(pluralPl(23, forms)).toBe("ćwiczenia");
    expect(pluralPl(104, forms)).toBe("ćwiczenia");
  });
});
