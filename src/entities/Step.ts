import { StepConfig, StepExecute } from "../types";
import { All } from "./All";
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
    stepExecute: StepExecute<Input, Result, InitialInput>,
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

  all<Result>(fn: (fn: () => All<Input, Input>) => void) {
    let alls: InternalStep[] = [];

    fn(
      () =>
        new All<any, any>({
          onEnd: (steps: InternalStep[]) => alls.push(...steps),
          internalSteps: this.internalSteps,
          initialInput: this.initialInput,
        })
    );

    return new Step<Result, InitialInput>({
      initialInput: this.initialInput,
      internalWorkflow: this.internalWorkflow,
      internalSteps: [...alls],
    });
  }

  async end() {
    await this.internalWorkflow.execute(this.internalSteps);
  }
}
