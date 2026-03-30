import { FastifyRequest, FastifyReply } from 'fastify';

export const authController = {
    async login(request: FastifyRequest, reply: FastifyReply) {
        const { email, password } = request.body as { email: string; password: string };

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@agencia.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (email !== adminEmail || password !== adminPassword) {
            return reply.status(401).send({ error: 'Credenciais inválidas' });
        }

        const token = await reply.jwtSign(
            { email, role: 'admin' },
            { expiresIn: '7d' }
        );

        return reply.send({ token, email, role: 'admin' });
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
        return reply.send(request.user);
    },
};