import { useState, useRef } from "react";


const CATEGORIAS = {
  "🥩 Carnes": {
    color: "#c0392b", glow: "rgba(192,57,43,0.35)",
    items: [
      { nombre: "Asado de tira", unidad: "kg", stock: 12, minimo: 8 },
      { nombre: "Vacio", unidad: "kg", stock: 6, minimo: 8 },
      { nombre: "Entrana", unidad: "kg", stock: 4, minimo: 5 },
      { nombre: "Bife de chorizo", unidad: "kg", stock: 9, minimo: 6 },
      { nombre: "Matambre", unidad: "kg", stock: 3, minimo: 4 },
      { nombre: "Costillas", unidad: "kg", stock: 10, minimo: 6 },
      { nombre: "Pollo entero", unidad: "unidades", stock: 8, minimo: 6 },
      { nombre: "Pechuga", unidad: "kg", stock: 5, minimo: 4 },
    ]
    proveedor: "La Pampa Carnes",
  },
  "🌭 Embutidos": {
    color: "#e67e22", glow: "rgba(230,126,34,0.35)",
    items: [
      { nombre: "Chorizo", unidad: "kg", stock: 7, minimo: 5 },
      { nombre: "Morcilla", unidad: "kg", stock: 2, minimo: 4 },
      { nombre: "Salchicha parrillera", unidad: "kg", stock: 5, minimo: 3 },
      { nombre: "Provoleta", unidad: "kg", stock: 3, minimo: 3 },
    ],
    proveedor: "La Pampa Carnes",
  },
  "🥬 Verduras": {
    color: "#27ae60", glow: "rgba(39,174,96,0.35)",
    items: [
      { nombre: "Lechuga", unidad: "unidades", stock: 5, minimo: 4 },
      { nombre: "Tomate", unidad: "kg", stock: 3, minimo: 5 },
      { nombre: "Cebolla", unidad: "kg", stock: 8, minimo: 5 },
      { nombre: "Papas", unidad: "kg", stock: 15, minimo: 10 },
      { nombre: "Limon", unidad: "unidades", stock: 20, minimo: 15 },
      { nombre: "Pimiento", unidad: "kg", stock: 2, minimo: 3 },
