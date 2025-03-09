import { StepConfig, StepArgs } from "../types";
import { InternalStep } from "./InternalStep";
import { InternalWorkflow } from "./InternalWorkflow";

export class Step<Input, InitialInput> {
  private internalWorkflow: InternalWorkflow;
  private internalSteps: InternalStep[];
  private initialInput: any;

  constructor(parameters: {
    internalWorkflow: InternalWorkflow;
    internalSteps: InternalStep[];
    initialInput: any;
  }) {
    const { internalSteps, internalWorkflow, initialInput } = parameters;
    this.internalSteps = internalSteps;
    this.internalWorkflow = internalWorkflow;
    this.initialInput = initialInput;
  }

  step<Result>(
    stepExecute: (
      input: Input,
      stepControlls: StepArgs<InitialInput>
    ) => Promise<Result>,
    config?: StepConfig
  ) {
    return new Step<Result, InitialInput>({
      initialInput: this.initialInput,
      internalWorkflow: this.internalWorkflow,
      internalSteps: [
        ...this.internalSteps,
        new InternalStep({
          execute: stepExecute,
          config,
          initialInput: this.initialInput,
        }),
      ],
    });
  }

  async end() {
    await this.internalWorkflow.execute(this.internalSteps);
  }
}
