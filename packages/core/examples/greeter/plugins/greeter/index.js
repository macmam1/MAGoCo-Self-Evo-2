export default {
  async register(ctx) {
    ctx.registry.registerDef({
      id: 'magoco.greet.hello',
      description: 'Greet someone',
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    });
    ctx.registry.provide('magoco.greet.hello', 'greeter', async (input, c) => {
      c.log.info('greeting requested', { input });
      ctx.emit('magoco.greet.hello', 'called', { input });
      return `GREETING[${c.config.greeting}] ${input.name}`;
    });
  },
  async teardown() { console.error('[greeter] torn down'); },
};
