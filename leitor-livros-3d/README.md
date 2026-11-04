# 📖 Leitor de Livros 3D — Experiência Imersiva em PDF

Um leitor web moderno, responsivo e de alta performance desenvolvido especialmente para leitura agradável e imersiva de livros em PDF com efeito 3D realista de virar páginas.

---

## ✨ Funcionalidades Principais

1. **Leitor de PDF 3D com Física Realista**:
   - Transição 3D suave com curvatura de papel, sombras volumétricas e iluminação dinâmica ao virar páginas.
   - Folheamento interativo clicando nas setas de navegação ou **arrastando diretamente os cantos das páginas** com o mouse ou toque na tela.
   - Capa rígida (*hardcover*) e páginas internas maleáveis (*soft paper*).
   - Efeito sonoro suave e realista de folhear papel (sintetizado via Web Audio API, sem latência e 100% offline).

2. **Renderização Nítida em Alta Fidelidade (High-DPI)**:
   - Utiliza **PDF.js** com renderização escalada para telas Retina/High-DPI.
   - Sistema de cache com **Sliding Window Rendering**: carrega e pré-renderiza páginas sob demanda (evitando sobrecarga de memória mesmo em livros com mais de 480 páginas).

3. **Sistema de Download Duplo Inteligente**:
   - **Baixar PDF Original (.pdf)**: Baixa o arquivo original preservando todas as 480 páginas, fontes vetoriais, texto selecionável e compatibilidade total com a **rolagem vertical contínua** em leitores de PDF padrão (Adobe Acrobat, Chrome, Edge, Kindle).
   - **Baixar Livro 3D Interativo (.html portátil)**: Gera um arquivo independente que contém o visualizador 3D completo e o livro embutido. Você pode abrir este arquivo em qualquer computador, tablet ou celular (mesmo sem internet) e ler o livro com o efeito 3D ativo!

4. **Controles Completos de Leitura**:
   - **Navegação**: Primeira página (`⏮`), Anterior (`◀`), Próxima (`▶`), Última página (`⏭`).
   - **Contador com salto rápido**: Digite qualquer número de página e pressione Enter.
   - **Linha do tempo (Slider)**: Deslize para percorrer as 480 páginas rapidamente com percentual de leitura.
   - **Zoom fluido**: Controles de zoom (diminuir, aumentar e redefinir 1:1) com suporte a arrastar/mover a página (*pan*) enquanto ampliada.
   - **Modo Tela Cheia**: Leitura imersiva sem distrações do navegador.
   - **Modo Foco / Zen**: Esconde suavemente as barras de navegação para foco total no livro (tecla `Z` ou `ESC`).
   - **Sumário / Capítulos**: Painel lateral com lista de seções e navegação rápida por clique.

5. **Biblioteca & Suporte a Outros Livros**:
   - Já vem configurado com a obra em destaque: **"Não é como nos Filmes" — Lynn Painter** (480 páginas).
   - **Adicionar Livro / Arrastar e Soltar**: Você pode arrastar qualquer arquivo PDF para a tela ou clicar em "Adicionar PDF" para ler qualquer livro ou documento com o mesmo efeito 3D.
   - **Marcador de Página Automático**: Salva automaticamente a última página lida no navegador para continuar de onde você parou.

6. **Personalização Visual**:
   - **Tema Obsidiana** (Tema escuro sofisticado com detalhes em dourado champagne).
   - **Tema Noite Profunda** (Tons azuis escuros relaxantes para leitura noturna).
   - **Tema Sépia Nobre** (Aparência de papel amarelado clássico).

---

## 🚀 Como Iniciar

### Opção 1: Clique Duplo (Windows)
Dê um clique duplo no arquivo **`Abrir Leitor de Livros 3D.bat`** na raiz ou em `leitor-livros-3d/Iniciar Leitor 3D.bat`. Ele iniciará o servidor local e abrirá o leitor automaticamente no seu navegador.

### Opção 2: Linha de Comando
```bash
cd leitor-livros-3d
node server.js
```
Acesse no seu navegador: **`http://localhost:3050`**

---

## ⌨️ Atalhos de Teclado
- **Seta Direita / Espaço / Page Down**: Próxima página
- **Seta Esquerda / Page Up**: Página anterior
- **Home**: Ir para a capa / página 1
- **End**: Ir para a última página
- **F**: Alternar modo de Tela Cheia
- **Z**: Alternar Modo Foco / Zen
- **ESC**: Fechar modais e sair do Modo Zen
