const uuid = require('uuid');
const deg2rad = deg => (deg * Math.PI) / 180.0;

function correctForOrigin(matrix_params, origin) {
    const [a, b, c, d, e, f] = matrix_params;
    const [tx, ty] = origin;
    
    // Helper function to perform matrix multiplication
    function multiplyMatrices(m1, m2) {
        var result = [];
        for (var i = 0; i < m1.length; i++) {
            result[i] = [];
            for (var j = 0; j < m2[0].length; j++) {
                var sum = 0;
                for (var k = 0; k < m1[0].length; k++) {
                    sum += m1[i][k] * m2[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    // Original transformation matrix
    var originalMatrix = [[a, c, e], [b, d, f], [0, 0, 1]];

    // Translation matrix to move the center of rotation to the origin (0,0)
    var translateToOrigin = [[1, 0, -tx], [0, 1, -ty], [0, 0, 1]];

    // Translation matrix to move back from the origin to the original center
    var translateBack = [[1, 0, tx], [0, 1, ty], [0, 0, 1]];

    // Combined transformation
    var combinedTransform = multiplyMatrices(multiplyMatrices(translateBack, originalMatrix), translateToOrigin);

    // Extract the new matrix components
    return [
        combinedTransform[0][0],
        combinedTransform[1][0],
        combinedTransform[0][1],
        combinedTransform[1][1],
        combinedTransform[0][2],
        combinedTransform[1][2]
    ];
}

const parseTransformation = (caixa, { transformOrigin }) => {
    // X and Y attributes
    const x = caixa.hasAttribute("x") ? parseFloat(caixa.getAttribute("x")) : 0;
    const y = caixa.hasAttribute("y") ? parseFloat(caixa.getAttribute("y")) : 0;

    if (!caixa.hasAttribute("transform")) return [1,0,0,1,x,y];
    const attr = caixa
        .getAttribute("transform")
        .split(') ')

    const transformations = attr.map(_transf => {
        const transf = _transf
            .replaceAll(', ', ',')
            .replaceAll(' ', ',')

        if (transf.indexOf("matrix(") > -1) {
            const numbers = transf.replace("matrix(", "").replace(")", "").split(',');
            const [a,b,c,d,e,f] = numbers.length === 6 ? numbers.map(n => parseFloat(n)) : [1,0,0,1,0,0];
            return !transformOrigin ? [
                [a,b,c,d,e,f]
            ] : [
                correctForOrigin([a,b,c,d,e,f], transformOrigin)
            ]
        } else if (transf.indexOf("rotate(") > -1) {
            const numbers = transf.replace("rotate(", "").replace(")", "").split(',');
            const [degs, a, b] =
                numbers.length === 3 ? numbers.map(n => parseFloat(n)) :
                numbers.length === 1 ? [parseFloat(numbers[0]), 0, 0] :
                [0, 0, 0];

            const c = Math.cos(deg2rad(degs));
            const s = Math.sin(deg2rad(degs));

            // // Rotate around (a,b)
            // const A = c*x - s*y -c*a + s*b + a;
            // const B = s*x + c*y -s*a - c*b + b;

            return [
                [1, 0, 0, 1, a, b],
                [c, s, -s, c, 0, 0],
                [1, 0, 0, 1, -a, -b]
            ]
        } else if (transf.indexOf("translate(") > -1) {
            const numbers = transf.replace("translate(", "").replace(")", "").split(',');
            const [tx, ty] = numbers.length === 2 ? numbers.map(n => parseFloat(n)) : [0, 0];

            return [
                [1,0,0,1,tx,ty]
            ]
        } else if (transf.indexOf("scale(") > -1) {
            const numbers = transf.replace("scale(", "").replace(")", "").split(',');

            if (numbers.length === 2) {
                const [sx, sy] = numbers.map(n => parseFloat(n));
                return [
                    [sx,0,0,sy,0,0]
                ]
            } else if (numbers.length === 1) {
                const [scale] = numbers.map(n => parseFloat(n))
        
                return [
                    scale > 0 ? [1,0,0,1,x,y] :
                    scale < 0 ? [-1,0,0,-1,0,0] :
                    [1,0,0,1,x,y]
                ]
            } else {
                return [
                    [1,0,0,1,x,y]
                ]
            }
        } else {
            return [
                [1,0,0,1,0,0]
            ]
        }
    });

    const [a,b,c,d,e,f] = transformations
        .flat()
        .reverse()
        .reduce((acc, [a,b,c,d,e,f]) => {
            const [aa,ab,ac,ad,ae,af] = acc;
            return [
                aa*a + ab*c,
                aa*b + ab*d,
                ac*a + ad*c,
                ac*b + ad*d,
                ae*a + af*c + e,
                ae*b + af*d + f
            ];
        }
        , [1,0,0,1,x,y]);

    return [a,b,c,d,e,f];
};

const rotate90 = [0,1,-1,0,0,0];
const identity = [1,0,0,1,0,0];

function parseInlineStyles(styleString) {
    // Split the string at each semicolon
    var styleArray = styleString.split(';');

    // Create an object to hold the key-value pairs
    var styleObject = {};

    // Loop through each style
    for (var i = 0; i < styleArray.length; i++) {
        // Split each style at the colon to separate the key and value
        var styleParts = styleArray[i].split(':');

        // If the split resulted in two parts
        if (styleParts.length === 2) {
            // Add the key and value to the style object
            styleObject[styleParts[0].trim()] = styleParts[1].trim();
        }
    }

    // Return the style object
    return styleObject;
}

const parseSVG = (svg) => {
    // Extract the content of the <style> element
    const styleElement = svg.querySelector('style');
    const styleContent = styleElement?.textContent || "";

    // Parse CSS rules from the style content
    const cssRules = styleContent.trim()
        .split(/}\s*/)
        .filter(rule => rule.length > 0)
        .map(rule => {
            const [selector, properties] = rule.split(/{\s*/);
            const propertyMap = properties.split(';').reduce((acc, property) => {
            const [key, value] = property.split(':').map(p => p.trim());
            if (key && value) {
                acc[key] = value;
            }
                return acc;
            }, {});
        
            return {
                selector: selector.trim(),
                properties: propertyMap,
            };
        });

    const caixes = [...svg.querySelectorAll("rect")].map(caixa => {
        const width = caixa.hasAttribute("width") ? parseFloat(caixa.getAttribute("width")) : 0;
        const height = caixa.hasAttribute("height") ? parseFloat(caixa.getAttribute("height")) : 0;

        const inlineCSS = caixa.hasAttribute('style') ? parseInlineStyles(caixa.getAttribute('style')) : {}

        const transformOrigin = inlineCSS['transform-origin']
            ?.replaceAll("px", "")
            ?.split(' ')
            ?.map(n => parseFloat(n))
            || null

        const matchedFillCssRule = cssRules
            .filter(rule => rule.properties.fill)
            .find(rule => caixa.matches(rule.selector))

        // Get fill color of rect (with getComputedStyle also)
        const fillColor =
            caixa.hasAttribute("fill") ? caixa.getAttribute("fill") :
            'fill' in inlineCSS ? inlineCSS.fill :
            matchedFillCssRule?.properties?.fill ||
            "white"

        if (caixa.getAttribute('stroke') === 'none' || caixa.getAttribute('display') === 'none') return;

        return {
            "type": "caixa",
            "box": {
                "width": width,
                "height": height,
                "transform": parseTransformation(caixa, {
                    transformOrigin,
                }),
                "fill": fillColor
            },
            "text": {
                "transform": (height > width ? rotate90 : identity)
            }
        }
    });

    const caixes_ids = Array.from({length: caixes.length}, () => uuid.v4());
    
    // const textos = [...svg.querySelectorAll("text")].map(text => {
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
    const jsonOutput = arrayKeys.reduce((obj, key, index) => ({ ...obj, [key]: arrayValues[index] }), {});

    return jsonOutput;

};

export default parseSVG;