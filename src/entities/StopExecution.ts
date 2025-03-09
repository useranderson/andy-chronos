export class StopExecution extends Error {
  value: any;

  constructor(value: any) {
    super("Execução interrompida");
    this.value = value;
  }
}
