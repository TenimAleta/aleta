import { useEffect, useState, useRef } from "react";
import SimultanisEditor from "./SimultanisEditor";

function PartEditor({ partname, availablePlantilles, handleSelectChange }) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <label>
                {partname}:
                <select
                    id={partname}
                    name={partname}
                    onChange={(e) => handleSelectChange(partname, e.target.value)}
                    style={{ marginLeft: "10px" }}
                >
                    <option
                        value=""
                    >
                        -
                    </option>

                    {
                        availablePlantilles
                            .map((plantilla, index) => (
                                <option
                                    key={index}
                                    value={plantilla}
                                >
                                    {plantilla}
                                </option>
                            ))
                    }
                </select>
            </label>
        </div>
    )
}

function CreateBundle({ socket, setShowCreateBundleForm }) {
    const [availablePlantilles, setAvailablePlantilles] = useState([]);
    const [availableBundles, setAvailableBundles] = useState([]);

    const [bundleName, setBundleName] = useState("");
    const [bundleSubtitol, setBundleSubtitol] = useState("");
    const [bundleNomCurt, setBundleNomCurt] = useState("");
    const [parts, setParts] = useState({
        'Pinya': '',
        'Folre': '',
        'Manilles': '',
        'Puntals': '',
        'Tronc': '',
        'Organització': '',
    });
    const [simultani, setSimultani] = useState(false);
    const [bundlesSimultanis, setBundlesSimultanis] = useState([])

    const createBundle = (attrs) => {
        socket.emit('.create_bundle', attrs);
        setShowCreateBundleForm(false)
    }

    const createBundlesATerra = (attrs) => {
        socket.emit('.create_bundles_a_terra', attrs);
        setShowCreateBundleForm(false)
    }

    useEffect(() => {
        socket.emit('.request_plantilles')
        socket.emit('.request_bundles')

        socket.on('.plantilles', (data) => setAvailablePlantilles(data));
        socket.on('.bundles', (data) => setAvailableBundles(
            data
                .filter(b => b?.hidden !== true)
                .filter(b => !b.simultani)
                .sort((a,b) => a.nom.localeCompare(b.nom))
        ));

        return () => {
            socket.off('.plantilles');
            socket.off('.bundles');
        }
    }, [socket]);

    const handleInputChange = (e) => {
        setBundleName(e.target.value);
    }

    const handleSelectChange = (partName, value) => {
        setParts(prevParts => ({
            ...prevParts,
            [partName]: value,
        }));
    }

    const handleButtonClick = () => {
        const validateForm = () => {
            if (bundleName === "") {
                alert("El nom de la prova no pot estar buit");
                return false;
            }

            return true;
        }

        if (!validateForm()) return;

        if (simultani) {
            // Create simultani
            createBundle({
                nom: bundleName,
                subtitol: bundleSubtitol,
                shortName: bundleNomCurt,
                simultani: true,
                bundles: bundlesSimultanis
            });
        } else {
            // Create bundle
            createBundle({
                nom: bundleName,
                subtitol: bundleSubtitol,
                shortName: bundleNomCurt,
                parts: parts
            });

            // Create bundle a terra
            if (parts['Pinya'] && ['Folre', 'Manilles', 'Puntals'].some(part => parts[part])) {
                const confirm = window.confirm(
                    'Vols crear també les proves a terra?\n' +
                    (parts['Folre'] ? `    - Folre a terra de ${bundleNomCurt}\n` : '') +
                    (parts['Manilles'] ? `    - Manilles a terra de ${bundleNomCurt}\n` : '') +
                    (parts['Puntals'] ? `    - Puntals a terra de ${bundleNomCurt}\n` : '')
                )

                if (confirm) {
                    createBundlesATerra({
                        nom: bundleName,
                        subtitol: bundleSubtitol,
                        shortName: bundleNomCurt,
                        parts: parts
                    });
                }
            }
        }
    }

    return (
        <div style={{ borderRadius: 20, margin: 20, padding: 20, backgroundColor: '#eee' }}>
            <h2>Crea prova</h2>

            <div style={{ marginBottom: "20px" }}>
                <label>
                    És simultània?
                    <input
                        type="checkbox"
                        id="simultani"
                        name="simultani"
                        checked={simultani}
                        onChange={(e) => setSimultani(e.target.checked)}
                        style={{ marginLeft: "10px" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label>
                    <span style={{ color: 'red', marginRight: 5 }}>*</span>
                    Nom:
                    <input
                        type="text"
                        id="nom"
                        name="nom"
                        placeholder="(Públic) Nom de la prova"
                        value={bundleName}
                        onChange={handleInputChange}
                        style={{ marginLeft: "10px", width: "100%" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label>
                    Nom curt:
                    <input
                        type="text"
                        id="nom_curt"
                        name="nom_curt"
                        placeholder="Nom curt de la prova"
                        value={bundleNomCurt}
                        onChange={e => setBundleNomCurt(e.target.value)}
                        style={{ marginLeft: "10px", width: "100%" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label>
                    Subtítol:
                    <input
                        type="text"
                        id="subtitol"
                        name="subtitol"
                        placeholder="(Privat) Comentaris de la prova"
                        value={bundleSubtitol}
                        onChange={(e) => setBundleSubtitol(e.target.value)}
                        style={{ marginLeft: "10px", width: "100%", marginTop: "10px" }}
                    />
                </label>
            </div>

            {
                simultani ? (
                    <div>
                        {
                            <SimultanisEditor
                                availableBundles={availableBundles}
                                selectedBundles={bundlesSimultanis}
                                setSelectedBundles={setBundlesSimultanis}
                            />
                        }
                    </div>
                ) : (
                    <div>
                        {
                            Object.keys(parts)
                                .map((partname, index) => (
                                    <PartEditor
                                        key={index}
                                        partname={partname}
                                        availablePlantilles={availablePlantilles}
                                        handleSelectChange={handleSelectChange}
                                    />
                                ))
                        }
                    </div>
                )
            }
        
            <button
                onClick={handleButtonClick}
                style={{ padding: "10px 20px", marginTop: "20px" }}
            >
                Crea prova
            </button>

            <button
                onClick={() => setShowCreateBundleForm(false)}
                style={{ 
                    backgroundColor: "#777",
                    padding: "10px 20px", marginTop: "20px", marginLeft: "20px"
                }}
            >
                Cancel·la
            </button>
        </div>
    )
}

export default CreateBundle;