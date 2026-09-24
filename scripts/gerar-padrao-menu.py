# -*- coding: utf-8 -*-
"""Gera o padrao do menu como mosaico que fecha.

O ficheiro que veio do designer e uma composicao: as formas saem para fora
do viewBox (x vai de -78 a 712 num desenho de 561 de largura) e nao voltam a
entrar do outro lado, por isso ve-se onde o mosaico se junta.

Aqui o desenho assenta numa malha regular -- colunas espacadas de A, linhas
de B, desencontradas a meio -- e a variacao de tamanhos vem de uma conta
sobre os indices, nao de acaso. Logo o desenho e periodico de raiz. Alem
disso cada forma e desenhada nove vezes, deslocada de mais ou menos uma
largura e uma altura, e o conjunto e recortado ao mosaico: o que sai por um
lado entra pelo outro no mesmo sitio.
"""
import io, math

COLS, LINS = 4, 6            # quantos pontos da malha cabem no mosaico
A, B = 100.0, 90.0           # espacamento entre colunas e entre linhas
L, A_TOT = COLS * A, LINS * B
INCLINACAO = math.radians(19)   # o quanto os losangos se deitam para a direita
TRACO = 1.1
COR, OPACIDADE = '#1E1E1E', 0.08

def losango(cx, cy, meia_l, meia_a, ang):
    c, s = math.cos(ang), math.sin(ang)
    pts = [(0, -meia_a), (meia_l, 0), (0, meia_a), (-meia_l, 0)]
    p = [(cx + x * c - y * s, cy + x * s + y * c) for x, y in pts]
    return 'M ' + ' L '.join('%.1f %.1f' % q for q in p) + ' Z'

def ponto(i, j):
    """Malha desencontrada: as linhas impares andam meia coluna."""
    return (i * A + (j % 2) * A / 2, j * B)

formas = []
for j in range(LINS):
    for i in range(COLS):
        cx, cy = ponto(i, j)
        # variacao periodica: depende so de i e j, logo repete com o mosaico
        v = (i * 3 + j * 5) % 7
        ml = 17 + v * 2.6
        formas.append(losango(cx, cy, ml, ml * (1.75 + (v % 3) * 0.22), INCLINACAO))
        if v % 3 == 0:   # de vez em quando, um segundo losango por dentro
            formas.append(losango(cx, cy, ml * 0.52, ml * 1.0, INCLINACAO))
        # o fio que enfia este losango no da linha seguinte
        nx, ny = ponto(i, j + 1)
        formas.append('M %.1f %.1f L %.1f %.1f' % (cx, cy, nx, ny))

grupos = []
for dx in (-L, 0, L):
    for dy in (-A_TOT, 0, A_TOT):
        grupos.append('    <g transform="translate(%g %g)">\n%s\n    </g>' % (
            dx, dy, '\n'.join('      <path d="%s"/>' % d for d in formas)))

svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="%g" height="%g" viewBox="0 0 %g %g">
  <defs>
    <clipPath id="mosaico"><rect width="%g" height="%g"/></clipPath>
  </defs>
  <g clip-path="url(#mosaico)" fill="none" stroke="%s" stroke-width="%s"
     stroke-linejoin="round" opacity="%s">
%s
  </g>
</svg>
''' % (L, A_TOT, L, A_TOT, L, A_TOT, COR, TRACO, OPACIDADE, '\n'.join(grupos))
io.open('assets/padrao-menu.svg', 'w', encoding='utf-8').write(svg)
print('assets/padrao-menu.svg %dx%d, %d bytes, %d formas x 9' % (L, A_TOT, len(svg), len(formas)))
