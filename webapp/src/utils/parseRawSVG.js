/* Codi usat a la consola del navegador web per extreure el JSON d'un .SVG fet amb Adobe Illustrator */

const deg2rad = deg => (deg * Math.PI) / 180.0;

const parseTransformation = caixa => {
    // X and Y attributes
    const x = caixa.hasAttribute("x") ? parseFloat(caixa.getAttribute("x")) : 0;
    const y = caixa.hasAttribute("y") ? parseFloat(caixa.getAttribute("y")) : 0;

    if (!caixa.hasAttribute("transform")) return [1,0,0,1,x,y];
    const attr = caixa
        .getAttribute("transform")
        .replaceAll(', ', ',')
        .replaceAll(' ', ',')

    if (attr.indexOf("matrix(") > -1) {
        const numbers = attr.replace("matrix(", "").replace(")", "").split(',');
        const [a,b,c,d,e,f] = numbers.length === 6 ? numbers.map(n => parseFloat(n)) : [1,0,0,1,0,0];
        const [ia,ib,ic,id] = [d,-b,-c,a];

        const tx = ia*x + ib*y;
        const ty = ic*x + id*y;

        return [a,b,c,d, e+tx, f+ty];
    } else if (attr.indexOf("rotate(") > -1) {
        const numbers = attr.replace("rotate(", "").replace(")", "").split(',');
        const [degs, a, b] = numbers.length === 3 ? numbers.map(n => parseFloat(n)) : [0, 0, 0];

        const c = Math.cos(deg2rad(degs));
        const s = Math.sin(deg2rad(degs));

        // Rotate around (a,b)
        const A = c*x - s*y -c*a + s*b + a;
        const B = s*x + c*y -s*a - c*b + b;

        return [c, s, -s, c, A, B];
    } else {
        return [1,0,0,1,x,y];
    }
};

const rotate90 = [0,1,-1,0,0,0];
const identity = [1,0,0,1,0,0];

const caixes = [...document.querySelectorAll("rect")].map(caixa => {
    const width = caixa.hasAttribute("width") ? parseFloat(caixa.getAttribute("width")) : 0;
    const height = caixa.hasAttribute("height") ? parseFloat(caixa.getAttribute("height")) : 0;
    const fillColor = getComputedStyle(caixa).fill === 'none' || !getComputedStyle(caixa).fill ? 'white' : getComputedStyle(caixa).fill;
    if (getComputedStyle(caixa).stroke === 'none' || getComputedStyle(caixa).display === 'none') return;

    return {
        "type": "caixa",
        "box": {
            "width": width,
            "height": height,
            "transform": parseTransformation(caixa),
            "fill": fillColor
        },
        "text": {
            "transform": (height > width ? rotate90 : identity)
        }
    }
});

const caixes_ids = [...Array(caixes.length).keys()];

// const textos = [...document.querySelectorAll("text")].map(text => {
//     const width = text.getBoundingClientRect().width;
//     const height = text.getBoundingClientRect().height;

//     return {
//         "type": "text",
//         "value": text.textContent,
//         "box": {
//             "transform": parseTransformation(associatedRect)
//         },
//         "text": {
//             "transform": (height > width ? rotate90 : identity)
//         }
//     }
// });

// const textos_ids = [...Array(textos.length).keys()].map(t => `text-${t}`);

const arrayKeys = [...caixes_ids]; // , ...textos_ids];
const arrayValues = [...caixes]; // , ...textos];
const obj = arrayKeys.reduce((obj, key, index) => ({ ...obj, [key]: arrayValues[index] }), {});

// Així ho puc copiar i enganxar a un fitxer .JSON
prompt("", JSON.stringify(obj))