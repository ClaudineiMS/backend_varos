import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();


// CREATE CONSULTOR (na tabela Client)
router.post("/consultores", async (req, res) => {
  try {
    const { nome, email, telefone, clients } = req.body;

    if (!nome || !email || !telefone) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const consultor = await prisma.client.create({
      data: {
        nome,
        email,
        telefone,
        tipoUsuario: "Consultor",
        Clientes: clients || [], 
      },
    });

    res.status(201).json({ success: true, consultor });
  } catch (err) {
    console.error("Erro ao criar consultor:", err);
    res.status(500).json({ error: err.message });
  }
});

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
      }
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
  const where = {
    NOT: { tipoUsuario: "Consultor" }
  };

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
      orderBy: { criadoEm: "desc" },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// COUNT CLIENTS (últimos 7 dias)
router.get("/count", async (_req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    
    const total = await prisma.user.count({
      where: { tipoUsuario: "Cliente" },
    });

    const last7Days = await prisma.user.count({
      where: {
        tipoUsuario: "Cliente",
        criadoEm: { gte: sevenDaysAgo },
      },
    });

    res.json({ total, last7Days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/clients-by-consultor", async (req, res) => {
  const { nome, email: emailConsultor, data } = req.query;

  try {
    let nomesClientes = [];

    if (nome) {
      const consultorRecord = await prisma.client.findFirst({
        where: { nome: { equals: String(nome) } },
      });

      if (!consultorRecord) return res.json([]);

      nomesClientes = Array.isArray(consultorRecord.Clientes)
        ? consultorRecord.Clientes
        : [];

      if (nomesClientes.length === 0 && !emailConsultor && !data) return res.json([]);
    }

    if (emailConsultor) {
      const consultorRecord = await prisma.client.findFirst({
        where: { email: { equals: String(emailConsultor) } },
      });

      if (!consultorRecord) return res.json([]);

      const clientesDoEmail = Array.isArray(consultorRecord.Clientes)
        ? consultorRecord.Clientes
        : [];

      nomesClientes = nomesClientes.length > 0
        ? nomesClientes.filter((c) => clientesDoEmail.includes(c))
        : clientesDoEmail;

      if (nomesClientes.length === 0 && !nome && !data) return res.json([]);
    }

    const where = {};

    if (nomesClientes.length > 0) {
      where.nome = { in: nomesClientes };
    }

    if (data) {
      const start = new Date(String(data));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.criadoEm = { gte: start, lt: end };
    }

    const users = await prisma.user.findMany({ where });

    res.json(users);
  } catch (err) {
    console.error("Erro na busca de clientes por consultor:", err);
    res.status(500).json({ error: err.message });
  }
});

// READ ONE USER BY CPF
router.get("/cpf/:cpf", async (req, res) => {
  const cpf = String(req.params.cpf);

  try {
    const user = await prisma.user.findUnique({
      where: { cpf },
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(user);
  } catch (err) {
    console.error("Erro ao buscar usuário por CPF:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER BY CPF
router.put("/cpf/:cpf", async (req, res) => {
  const cpf = String(req.params.cpf);
  const { nome, email, telefone, idade, endereco, tipoUsuario, clients } = req.body;

  try {
    const user = await prisma.user.update({
      where: { cpf },
      data: {
        nome,
        email,
        telefone,
        idade: idade ? Number(idade) : undefined,
        endereco,
        tipoUsuario,
        ...(tipoUsuario === "Consultor" && clients?.length
          ? {
              clients: {
                deleteMany: {}, // remove clientes antigos
                create: clients.map((c) => ({ nome: c })),
              },
            }
          : {}),
      },
    });

    res.json(user);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    console.error("Erro ao atualizar usuário por CPF:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:cpf", async (req, res) => {
  const cpf = String(req.params.cpf);
  try {
    const deletedUser = await prisma.user.delete({
      where: { cpf },
    });
    res.status(200).json({ message: "Usuário deletado com sucesso", deletedUser });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;