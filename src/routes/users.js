import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// CREATE
router.post("/create", async (req, res) => {
  const { tipoUsuario, nome, email, telefone, cpf, idade, endereco, clients } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        tipoUsuario,
        nome,
        email,
        telefone,
        cpf,
        idade,
        endereco,
        clients: tipoUsuario === "Consultor" && clients?.length
          ? {
              create: clients.map((c) => ({ nome: c })),
            }
          : undefined,
      },
      include: {
        clients: true,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  const { nome, email, data } = req.query;

  const where = {};

  // Filtro por nome
  if (nome) {
    where.OR = [
      { nome: { contains: nome } },
      { nome: { contains: nome.toLowerCase() } },
      { nome: { contains: nome.toUpperCase() } },
    ];
  }

  // Filtro por email
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

  // Filtro por data
  if (data) {
    const start = new Date(data);
    const end = new Date(data);
    end.setDate(end.getDate() + 1);

    where.AND = [
      ...(where.AND || []),
      {
        criadoEm: {
          gte: start,
          lt: end,
        },
      },
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
