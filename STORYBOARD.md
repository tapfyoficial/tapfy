# Tapfy NFC — Storyboard do Vídeo de Produto

**Formato:** 1080 × 1920 px · 30 fps · 19 segundos (570 frames)  
**Estilo:** Fundo azul escuro (#030a1a) com glow radial azul, iPhone 15 Pro flutuando

---

## Cena 1 — iPhone flutuando (frames 0–64)

- Fundo escuro azul aparece com fade suave  
- iPhone 15 Pro cinza-titânio surge do centro com spring physics (escala 0.75 → 1.0)  
- Glow azul no chão reflete levemente embaixo do iPhone  
- iPhone flutua com movimento senoidal suave (±12px)  
- Tela com wallpaper iOS escuro, status bar 9:41, Dynamic Island em pílula pequena  

---

## Cena 2 — Cartão Tapfy desce (frames 65–147)

- Cartão Tapfy NFC entra pelo topo da tela, centralizado sobre o iPhone  
- Cartão inclina levemente (rotateX -18° → 0°, rotateY 6° → 0°) durante a descida — dá sensação de profundidade 3D  
- iPhone tilta suavemente para trás (rotateX 0° → 8°) para sugerir que a parte traseira está visível  
- Cartão desce até ficar posicionado atrás da parte superior do iPhone (zona NFC)  

---

## Cena 3 — Toque NFC (frames 148–177)

- Cartão para na posição de leitura  
- Três ondas circulares pulsam da zona NFC (azul, expandindo, fade out)  
- iPhone volta ao ângulo frontal  
- Cartão desaparece com fade out  

---

## Cena 4 — Notificação na Dynamic Island (frames 178–257)

- Dynamic Island expande suavemente: pílula 126×38 → 340×86px  
- Conteúdo da notificação aparece com fade:  
  - Ícone Google "G" (colorido) à esquerda  
  - **"Avaliar no Google"** (branco, bold) + **"Toque para abrir"** (cinza)  
  - **"agora"** (cinza claro, direita)  

---

## Cena 5 — Toque na notificação (frames 258–299)

- Ripple circular branco anima no centro da Dynamic Island (simulando toque)  
- Dynamic Island fecha/encolhe  

---

## Cena 6 — Página de avaliação Google (frames 300–349)

- Tela de avaliação Google desliza para cima (slide-up, cubic ease-out)  
- Header com ícone azul + **"Sua Empresa"** + endereço  
- 5 estrelas vazias exibidas  
- Campo de texto com placeholder cinza  
- Botão **"Publicar"** azul na base  

---

## Cena 7 — Estrelas + texto + publicar (frames 350–479)

- **Frames 350–424:** 5 estrelas preenchem amarelas, uma a uma (a cada 15 frames)  
  - Cada estrela escala para 1.15 ao aparecer  
- **Frames 415–452:** Texto *"Atendimento excelente e experiência incrível!"* digita com cursor piscando, borda do campo fica azul  
- **Frame 460:** Botão "Publicar" pressiona levemente (scale 0.96)  

---

## Cena 8 — Sucesso (frames 480–570)

- Overlay escuro aparece com fade sobre a tela  
- Checkmark verde (circle + polyline) anima com spring (escala 0 → 1)  
- **"Avaliação enviada!"** (branco, 26px bold) sobe com fade  
- **"Obrigado por compartilhar sua experiência."** (cinza, 16px)  
- iPhone continua flutuando suavemente no fundo  

---

## Detalhes de animação

| Elemento | Técnica |
|----------|---------|
| Entrada do iPhone | `spring({ damping: 18, stiffness: 55 })` |
| Float do iPhone | `Math.sin(frame/fps * π * 0.7) * 12px` |
| Descida do cartão | `interpolate` com `Easing.out(Easing.quad)` |
| Dynamic Island expand | `spring({ damping: 22, stiffness: 120 })` |
| Slide review page | `interpolate` com `Easing.out(Easing.cubic)` |
| Checkmark sucesso | `spring({ damping: 14, stiffness: 90 })` |
| Glow azul fundo | `Math.sin` pulsando amplitude e opacidade |
| Ondas NFC | 3 círculos com delay escalonado, fade out |
