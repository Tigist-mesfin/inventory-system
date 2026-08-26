class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async interpret() {
    throw new Error("interpret not implemented");
  }

  async explain() {
    throw new Error("explain not implemented");
  }
}

module.exports = AIProvider;
