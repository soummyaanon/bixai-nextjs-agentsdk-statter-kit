import { tool } from "@openai/agents";
import { z } from "zod";

const MAX_OPERAND_MAGNITUDE = 1_000_000_000_000;

const OperandSchema = z
  .number()
  .finite()
  .refine(
    (value) => Math.abs(value) <= MAX_OPERAND_MAGNITUDE,
    `Operands must be within +/-${MAX_OPERAND_MAGNITUDE}.`,
  );

const OperationSchema = z.enum([
  "add",
  "subtract",
  "multiply",
  "divide",
  "modulo",
  "power",
]);

const CalculatorInputSchema = z
  .object({
    operation: OperationSchema.describe("Arithmetic operation to execute."),
    left: OperandSchema.describe("Left numeric operand."),
    right: OperandSchema.describe("Right numeric operand."),
  })
  .strict();

function compute(
  operation: z.infer<typeof OperationSchema>,
  left: number,
  right: number,
): number {
  switch (operation) {
    case "add":
      return left + right;
    case "subtract":
      return left - right;
    case "multiply":
      return left * right;
    case "divide":
      if (right === 0) {
        throw new Error("Division by zero is not allowed.");
      }
      return left / right;
    case "modulo":
      if (right === 0) {
        throw new Error("Modulo by zero is not allowed.");
      }
      return left % right;
    case "power":
      return left ** right;
    default:
      throw new Error(`Unsupported operation: ${String(operation)}`);
  }
}

export const calculatorTool = tool({
  name: "calculator",
  description:
    "Deterministically perform arithmetic on two numbers. Use this instead of mental math.",
  parameters: CalculatorInputSchema,
  execute: async ({ operation, left, right }) => {
    const result = compute(operation, left, right);

    if (!Number.isFinite(result)) {
      throw new Error("Computation produced a non-finite result.");
    }

    return { operation, left, right, result };
  },
});
