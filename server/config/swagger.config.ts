// swagger.config.ts
export const swaggerOptions = {
    swaggerDefinition: {
      info: {
        title: "GymApplication API",
        description: "Gym API Information",
        version: "0.0.1",
        servers: ["http://localhost:3000"],
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: ["./routes/*.ts"],
  };