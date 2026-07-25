import cuy from "../assets/images/featuredDishes/cuy.png"
import malaya from "../assets/images/featuredDishes/malaya.png"
import chicharron from "../assets/images/featuredDishes/chicharron.png"
import trucha from "../assets/images/featuredDishes/trucha.png"

// ==================================
// PLATOS DESTACADOS DEL RESTAURANTE
// ==================================

const featuredDishes = [
    {
        id:1,
        nombre:"Cuy al Horno",
        precio:"s/50",
        descripcion:"Rico cuy acompañado de tallarin al horno con su rocoto relleno y papa",
        imagen: cuy
    },
    
    {
        id:2,
        nombre:"Malaya Frita",
        precio:"s/25",
        descripcion:"Malaya frita con arroz papa frita o sancochada y ensalada",
        imagen: malaya
    },

    {
        id:3,
        nombre:"Chicharron",
        precio:"s/25",
        descripcion:"Chicharron de cerdo con mote papa y ensalada de hierba buena y cebolla",
        imagen: chicharron
    },

    {
        id:4,
        nombre:"Trucha",
        precio:"s/15",
        descripcion:"Trucha Frita con su arroz papa y ensalada",
        imagen: trucha
    },
]

export default featuredDishes;