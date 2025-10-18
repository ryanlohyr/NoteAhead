export class Reporter {
  state: string | null;
  node: HTMLDivElement | null;
  setAt: number;

  constructor() {
    this.state = null;
    this.node = null;
    this.setAt = 0;
  }

  clearState() {
    if (this.state && this.node) {
      document.body.removeChild(this.node);
      this.state = null;
      this.node = null;
      this.setAt = 0;
    }
  }

  failure(err: Error | string) {
    this.show("fail", err.toString());
  }

  delay(err: Error | string) {
    if (this.state === "fail") return;
    this.show("delay", err.toString());
  }

  show(type: string, message: string) {
    this.clearState();
    this.state = type;
    this.setAt = Date.now();
    this.node = document.body.appendChild(document.createElement("div"));
    this.node.className = "ProseMirror-report ProseMirror-report-" + type;
    this.node.textContent = message;
  }

  success() {
    if (this.state === "fail" && this.setAt > Date.now() - 1000 * 10) {
      setTimeout(() => this.success(), 5000);
    } else {
      this.clearState();
    }
  }
}

