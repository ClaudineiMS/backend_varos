// routes/users.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// CREATE
router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone, cpf, idade, endereco } = req.body;
    const user = await prisma.user.create({
      data: { nome, email, telefone, cpf, idade, endereco },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
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
