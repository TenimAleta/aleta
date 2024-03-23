const _SETTINGS = {
    "sarri": {
        color: "#582733",
        fullname: "Castellers de Sarrià",
        shortname: "Sarrià",
    },
    "esquerdats": {
        color: "#7F3BB0",
        fullname: "Colla Castellera de l'Esquerra de l'Eixample",
        shortname: "Esquerdats",
    },
    "bergants": {
        color: "#b8da49",
        fullname: "Bergants del Campus de Terrassa",
        shortname: "Bergants",
    },
    "demo": {
        color: "rgb(0,100,150)",
        fullname: "Demostració de l'Aleta",
        shortname: "Demo",
    },
    "berga": {
        color: "#00388c",
        fullname: "Castellers de Berga",
        shortname: "Berga",
    },
    "matossers": {
        color: "#905E28",
        fullname: "Colla Castellera Matossers de Molins de Rei",
        shortname: "Matossers",
    },
    "llunatics": {
        color: "#1e4696",
        fullname: "Llunàtics UPC Vilanova",
        shortname: "Llunàtics",
    },
    "8m": {
        color: "#410066",
        fullname: "Diada del 8 de Març",
        shortname: "8M",
    },
    "santpedor": {
        color: "#e1ae04",
        fullname: "Castellers de Santpedor",
        shortname: "Santpedor",
    },
    "pataquers": {
        color: "#F08015",
        fullname: "Pataquers de la URV",
        shortname: "Pataquers",
    },
    "falconsbcn": {
        color: "#fc6262",
        fullname: "Falcons de Barcelona",
        shortname: "Falcons",
    },
    "ganapies": {
        color: "#003153",
        fullname: "Ganàpies de la UAB",
        shortname: "ganapies",
    },
    "trempats": {
        color: "#d3bb90",
        fullname: "Trempats de la UPF",
        shortname: "trempats",
    },
    "arreplegats": {
        color: "#4eb57a",
        fullname: "Arreplegats de la Zona Universitària",
        shortname: "arreplegats",
    },
}

const LOADING = {
    color: "#FFF",
    fullname: "Carregant...",
    shortname: "Carregant...",
}

export const COLLES = Object.keys(_SETTINGS);

const SETTINGS = (colla) => {
    if (colla in _SETTINGS) return _SETTINGS[colla];
    else return LOADING;
}

export default SETTINGS;