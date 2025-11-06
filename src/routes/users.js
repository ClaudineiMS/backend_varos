import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();


//CREATE CONSULTOR
router.post("/consultores", async (req, res) => {
  try {
    const { nome, email, telefone, clients } = req.body;

    if (!nome || !email || !telefone) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const consultor = await prisma.user.create({
      data: {
        tipoUsuario: "Consultor",
        nome,
        email,
        telefone,
        clients: clients?.length
          ? {
              create: clients.map((c) => ({
                nome: typeof c === "string" ? c : c.nome,
              })),
            }
          : undefined,
      },
      include: { clients: true },
    });

    res.status(201).json({ success: true, consultor });
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.join(", ");
      return res.status(409).json({
        error: `Já existe um registro com o mesmo valor para o campo: ${field}.`,
      });
    }

    console.error("Erro ao criar consultor:", err);
    res.status(500).json({ error: err.message });
  }
})

// CREATE USER
router.post("/create", async (req, res) => {
  try {
    const { tipoUsuario, nome, email, telefone, cpf, idade, endereco, clients } = req.body;

    const user = await prisma.user.create({
      data: {
        tipoUsuario,
        nome,
        email,
        telefone,
        cpf,
        idade: Number(idade),
        endereco,
        ...(tipoUsuario === "Consultor" && clients?.length
          ? {
              clients: {
                create: clients.map((c) => ({
                  nome: typeof c === "string" ? c : c.nome,
                })),
              },
            }
          : {}),
      },
      include: { clients: true },
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    res.status(500).json({ error: err.message });
  }
});

// READ ALL USERS
router.get("/", async (req, res) => {
  const { nome, email, data } = req.query;
  const where = {};

  if (nome) {
    where.OR = [
      { nome: { contains: nome } },
      { nome: { contains: nome.toLowerCase() } },
      { nome: { contains: nome.toUpperCase() } },
    ];
  }

  if (email) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { email: { contains: email } },
          { email: { contains: email.toLowerCase() } },
          { email: { contains: email.toUpperCase() } },
        ],
      },
    ];
  }

  if (data) {
    const start = new Date(data);
    const end = new Date(data);
    end.setDate(end.getDate() + 1);
    where.AND = [
      ...(where.AND || []),
      { criadoEm: { gte: start, lt: end } },
    ];
  }

  try {
    const users = await prisma.user.findMany({
      where,
      include: { clients: true },
      orderBy: { criadoEm: "desc" },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// COUNT USERS (últimos 7 dias)
router.get("/count", async (_req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const total = await prisma.user.count();
    const last7Days = await prisma.user.count({
      where: {
        criadoEm: {
          gte: sevenDaysAgo,
        },
      },
    });

    res.json({ total, last7Days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, telefone, cpf, idade, endereco } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { nome, email, telefone, cpf, idade, endereco },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export default (isso é crucial para ES Modules)
export default router;
