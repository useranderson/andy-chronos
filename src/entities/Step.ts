import { StepConfig, StepExecute } from "../types";
import { InternalStep } from "./InternalStep";
import { InternalWorkflow } from "./InternalWorkflow";

type StepType = "DEFAULT" | "ALL";

export class Step<Input, InitialInput, Conditional extends StepType> {
  private internalWorkflow: InternalWorkflow;
  private internalSteps: InternalStep[];
  private initialInput: any;
  private type: Conditional;
  private onEndAll?: (internalSteps: InternalStep[]) => void;

  constructor(parameters: {
    internalWorkflow: InternalWorkflow;
    internalSteps: InternalStep[];
    initialInput: any;
    type: Conditional;
    onEndAll?: (internalSteps: InternalStep[]) => void;
  }) {
    const { internalSteps, internalWorkflow, initialInput, type, onEndAll } =
      parameters;
    this.internalSteps = internalSteps;
    this.internalWorkflow = internalWorkflow;
    this.initialInput = initialInput;
    this.type = type;
    this.onEndAll = onEndAll;
  }

  step<Result>(
    stepExecute: StepExecute<Input, Result, InitialInput>,
    config?: StepConfig
  ) {
    if (this.type === "ALL") {
      const fnName = stepExecute.name;

      const obj = {
        [fnName]: async (previousParams: any, controlls: any) => {
          const inKeep = Boolean(previousParams?._keep);

          const result = await stepExecute(
            inKeep ? previousParams.params : previousParams,
            controlls
          );

          return inKeep
            ? { ...previousParams, [fnName]: result }
            : { params: { ...previousParams }, [fnName]: result, _keep: true };
        },
      };

      return new Step<
        Conditional extends "DEFAULT" ? Result : Input,
        InitialInput,
        "DEFAULT"
      >({
        initialInput: this.initialInput,
        internalWorkflow: this.internalWorkflow,
        type: "ALL" as any,
        onEndAll: this.onEndAll,
        internalSteps: [
          ...this.internalSteps,
          new InternalStep({
            execute: obj[fnName] as any,
            config,
            initialInput: this.initialInput,
          }),
        ],
      });
    }

    return new Step<
      Conditional extends "DEFAULT" ? Result : Input,
      InitialInput,
      "DEFAULT"
    >({
      initialInput: this.initialInput,
      internalWorkflow: this.internalWorkflow,
      type: "DEFAULT",
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

  all<Result>(fn: (fn: () => Step<Input, InitialInput, "ALL">) => void) {
    let alls: InternalStep[] = [];

    fn(
      () =>
        new Step<any, any, "ALL">({
          initialInput: this.initialInput,
          internalSteps: this.internalSteps,
          internalWorkflow: this.internalWorkflow,
          type: "ALL",
          onEndAll: (internalSteps) => {
            alls.push(...internalSteps);
          },
        })
    );

    return new Step<Result, InitialInput, "DEFAULT">({
      initialInput: this.initialInput,
      internalWorkflow: this.internalWorkflow,
      internalSteps: [...alls],
      type: "DEFAULT",
    });
  }

  async end() {
    if (this.type === "ALL") {
      this.onEndAll?.(this.internalSteps);
      this.type = "DEFAULT" as any;
      return;
    }

    console.log("end", { steps: this.internalSteps });

    await this.internalWorkflow.execute(this.internalSteps);
  }
}
