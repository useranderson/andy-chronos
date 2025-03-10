import { StepConfig, StepExecute } from "../types";
import { InternalStep } from "./InternalStep";

export class All<Input, InitialInput> {
  private internalSteps: InternalStep[];
  private onEnd: (steps: InternalStep[]) => void;
  private initialInput: InitialInput;

  constructor(parameters: {
    onEnd: (steps: InternalStep[]) => void;
    internalSteps: InternalStep[];
    initialInput: InitialInput;
  }) {
    const { internalSteps, onEnd, initialInput } = parameters;

    this.internalSteps = internalSteps;
    this.onEnd = onEnd;
    this.initialInput = initialInput;
  }

  step<Result>(
    fn: StepExecute<Input, Result, InitialInput>,
    config?: StepConfig
  ) {
    const fnName = fn.name;

    const obj = {
      [fnName]: async (previousParams: any, controlls: any) => {
        const inKeep = Boolean(previousParams?._keep);

        const result = await fn(
          inKeep ? previousParams.params : previousParams,
          controlls
        );

        return inKeep
          ? { ...previousParams, [fnName]: result }
          : { params: { ...previousParams }, [fnName]: result, _keep: true };
      },
    };

    return new All<Input, InitialInput>({
      internalSteps: [
        ...this.internalSteps,
        new InternalStep({
          execute: obj[fn.name] as any,
          initialInput: this.initialInput,
          config,
        }),
      ],
      onEnd: this.onEnd,
      initialInput: this.initialInput,
    });
  }

  end() {
    this.onEnd(this.internalSteps);
  }
}
