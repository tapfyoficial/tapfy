# TapfyNFCDemo — Storyboard

**Composição:** `TapfyNFCDemo` | 1920×1080 | 30 fps | 540 frames (18 s)

---

## Cena 1 — Estabelecimento (frames 0–75 | 0–2.5 s)

**Visual:** Fundo escuro azul profundo com glow azul no chão.
iPhone 15 Pro titanium flutua para dentro com spring animation.
Leve perspectiva 3D (rotateY 12°, rotateX -3°).
Tela: lock screen (9:41, wallpaper escuro).
Botões laterais visíveis.

---

## Cena 2 — Cartão entra (frames 75–165 | 2.5–5.5 s)

**Visual:** Cartão Tapfy (Google Reviews) desce de cima da tela.
Entra com leve tilt (rotateX 25° → 0°) para dar sensação 3D de profundidade.
Cartão posicionado atrás da parte superior do iPhone (z-order).
iPhone continua flutuando suavemente (keyframes de float).

---

## Cena 3 — Tap NFC (frames 165–205 | 5.5–6.8 s)

**Visual:** Cartão chega à parte traseira do iPhone (topo).
3 ondas concêntricas azuis irradiam do ponto de contato (ripples).
Cartão começa a recuar e sair pela parte de cima.

---

## Cena 4 — Dynamic Island expande (frames 205–265 | 6.8–8.8 s)

**Visual:** A Dynamic Island (pílula preta) se expande progressivamente.
Conteúdo aparece: ícone G branco + "Avaliar no Google" + "Toque para abrir" + "agora".
Pequena animação de squeeze/tap na Island (simula toque automático).

---

## Cena 5 — Google Review abre (frames 265–315 | 8.8–10.5 s)

**Visual:** Tela do iPhone faz transição com slide-up.
Formulário Google Reviews aparece: "Sua Empresa", 5 estrelas vazias, campo de texto, botão Publicar azul.

---

## Cena 6 — Estrelas preenchidas (frames 315–415 | 10.5–13.8 s)

**Visual:** Cada estrela preenche uma a uma com dourado (#FBBC05).
Ritmo: ~1 estrela a cada 0.7 segundos.
Ao terminar, todas as 5 estrelas estão douradas.

---

## Cena 7 — Texto + Publicar (frames 415–472 | 13.8–15.7 s)

**Visual:** Texto de avaliação aparece no campo: "Atendimento excelente e experiência incrível!".
Botão "Publicar" faz leve scale-down (simula press físico).

---

## Cena 8 — Sucesso (frames 472–540 | 15.7–18 s)

**Visual:** Overlay escuro semi-transparente aparece sobre a tela.
Círculo verde com ✓ branco anima dentro.
Texto: "Avaliação enviada!" + "Obrigado por compartilhar sua experiência."
Cartão Tapfy mini aparece no canto inferior direito com rotação -8° (spring in).
Watermark "tapfy." visível no rodapé.

---

## Paleta de cores

| Elemento           | Cor           |
|--------------------|---------------|
| Fundo              | `#030509`     |
| Blue glow          | `#1a4aff`     |
| iPhone body        | `#1e1e22`     |
| Cartão             | `#0b0b0b`     |
| Google Azul        | `#4285F4`     |
| Google Vermelho    | `#EA4335`     |
| Google Amarelo     | `#FBBC05`     |
| Google Verde       | `#34A853`     |
| Botão Publicar     | `#1a73e8`     |
| Sucesso Verde      | `#34A853`     |

---

## Como visualizar

```bash
cd video
npx remotion studio
# Abrir: http://localhost:3000
# Selecionar: TapfyNFCDemo
```

## Como renderizar

```bash
cd video
npx remotion render TapfyNFCDemo out/tapfy-nfc-demo.mp4
```
