import { StepConfig, StepArgs } from "../types";
import { StopExecution } from "./StopExecution";

const defaultStepConfig: StepConfig = {
  maxRetries: 0,
};

export class InternalStep {
  private _execute: (data: any, stepControlls: StepArgs<any>) => Promise<any>;
  private name: string;
  private config: StepConfig;
  private initialInput: any;

  constructor(parameters: {
    initialInput: any;
    execute: (data: any, stepControlls: StepArgs<any>) => Promise<any>;
    config?: StepConfig;
  }) {
    const { execute, config = {}, initialInput } = parameters;

    this.initialInput = initialInput;

    this._execute = execute;
    this.config = { ...defaultStepConfig, ...config };
    this.name = execute.name || "anonymous";
  }

  get getName() {
    return this.name;
  }

  get getConfig() {
    return this.config;
  }

  execute(input: any) {
    return this._execute(input, {
      initialInput: this.initialInput,
      stop: (data: unknown) => {
        throw new StopExecution(data);
      },
    });
  }
}
