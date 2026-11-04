# 💳 Quanto Eu Devo? — Gestor Pessoal de Acertos & Gastos (Com Acesso pelo Celular)

Um aplicativo to-do list financeiro, moderno e elegante, feito especialmente para quem precisa gerenciar gastos que outras pessoas (como sua mãe) cobriram temporariamente até a data do seu pagamento (ex: dia 01).

---

## 📱 Como Conectar o Celular da sua Mãe (Sem Senha)

Tudo o que a sua mãe adicionar no celular dela **aparece na hora no seu computador e fica salvo no banco de dados (`database.json`)**, sem precisar de login nem senha.

### 1. No mesmo Wi-Fi de casa:
1. Dê um clique duplo em **`Iniciar Servidor e Celular.bat`**.
2. Na tela que abrir, clique no botão **`📲 Conectar Celular`** no topo.
3. Peça para sua mãe **apontar a câmera do celular dela para o QR Code** que vai aparecer na tela, ou clique no botão **"Mandar Link para a Mãe no WhatsApp"**!
4. Pronto! O celular dela abre direto a lista, e tudo o que ela adicionar lá sincroniza na hora com o seu computador!

### 2. Fora de casa (no 4G / Rua):
1. Caso ela esteja fora de casa, dê um clique duplo em **`Conectar Celular Fora de Casa (4G).bat`**.
2. Ele vai gerar um link seguro (ex: `https://...loca.lt`) que funciona de qualquer lugar do mundo!

---

## ✨ Funcionalidades Principais

1. **Adição Rápida (To-Do)**:
   - Digite o que ela pagou (ex: *Remédio*), o valor (ex: *35*) e clique em Adicionar.
   - Botões rápidos: `👩 Mãe pagou` e `🙋‍♂️ Eu pedi`.

2. **Banco de Dados Real & Persistente**:
   - Salvo em `database.json` no seu computador.
   - Atualização automática em tempo real a cada 2,5 segundos.

3. **Dashboard Financeiro & Previsão de Pagamento**:
   - Total a Pagar Pendente, Total Já Reembolsado, Ticket Médio.
   - Contagem regressiva: *"Faltam X dias para o acerto (Dia 01)"*.
   - Botão **"Quitar Pendências"** no dia do acerto com chuva de confetes 🎉.

4. **Extrato Formatado para WhatsApp**:
   - Gere com 1 clique a prestação de contas detalhada para transferir no dia do pagamento.
