#!/usr/bin/env python3
"""Builds unclawdesign/assets/customizer.js from customizer.src.js by inserting the compact Wada
data (unclawdesign/data/wada-combos.json) at /*WADA_DATA*/. Run after build/build_wada.py."""
import os
A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'unclawdesign')
src = open(os.path.join(A, 'assets/customizer.src.js')).read()
data = open(os.path.join(A, 'data/wada-combos.json')).read().strip()
out = src.replace('/*WADA_DATA*/', data, 1)
open(os.path.join(A, 'assets/customizer.js'), 'w').write(out)
print('assets/customizer.js', len(out), 'bytes')
