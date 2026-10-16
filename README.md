# AttackZoo: site da qualificação

Site de apoio ao exame de qualificação de mestrado de Leonardo de Jesus Bitzki (PPGES/UNIPAMPA), sobre o AttackZoo, um testbed reprodutível e extensível para experimentação com ataques de rede. Publicado pelo GitHub Pages a partir da raiz deste repositório.

## Estrutura

- `index.html`: página única, em português.
- `assets/css/site.css`: estilos, com tema claro e escuro.
- `assets/js/caps.js`: detecta os recursos do navegador (Canvas 2D, requestAnimationFrame, IntersectionObserver, variáveis CSS, color-mix e preferência por movimento reduzido) antes de qualquer animação e avisa o visitante quando algo falta.
- `assets/js/data.js`: catálogo dos 60 ataques, extraído dos `attack.yaml` de [GT-IoTEdu/attackzoo-sbseg26](https://github.com/GT-IoTEdu/attackzoo-sbseg26).
- `assets/js/site.js`: catálogo interativo, gráficos e abas.

## Visualizar localmente

```
python3 -m http.server 8000
```

Depois, abra http://localhost:8000.

## Fontes

Os números vêm do texto da qualificação e dos artigos publicados no ERRC 2025, no SBCUP 2026 e no SBSeg 2026. As séries temporais do experimento são ilustrativas e foram geradas a partir dos valores publicados.
