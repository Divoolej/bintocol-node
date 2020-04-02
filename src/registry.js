const registry = {
  events: {},

  register: function({ event, body }) {
    this.events[event] = body;
  },

  getSchema: function(event) {
    return this.events[event];
  },

  types: {
    BOOL: 'BOOL',
    INT: 'INT',
    UINT: 'UINT',
    FLOAT: 'FLOAT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    NOTHING: 'NOTHING',
  },
};

registry.register = registry.register.bind(registry);
registry.getSchema = registry.getSchema.bind(registry);

module.exports = registry;
