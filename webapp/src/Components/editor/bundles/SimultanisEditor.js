import React, { useState } from 'react';

const dropdownStyle = {
    marginLeft: "10px",
    width: "100%"
};

const flexContainerStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px"
};

const buttonStyle = {
    marginLeft: "10px"
};

function Dropdown({ bundles, selectedValue, onChange }) {
    return (
        <select
            name="bundle"
            onChange={onChange}
            value={selectedValue}
            style={dropdownStyle}
        >
            <option value="">--</option>
            {
                bundles.map(bundle => (
                    <option key={bundle.id} value={bundle.id}>
                        {bundle.nom}
                    </option>
                ))
            }
        </select>
    );
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function SimultanisEditor({ availableBundles, selectedBundles, setSelectedBundles }) {
    const [lastDropdownValue, setLastDropdownValue] = useState("");  

    const handleSimultaniChange = (index) => (event) => {
        const value = event.target.value;
        const updatedBundles = [...selectedBundles];

        if (value === "") {
            updatedBundles.splice(index, 1); 
        } else {
            const newBundle = availableBundles.find(bundle => bundle.id === value);

            const bundleData = {
                ...newBundle,
                part_id: generateUniqueId()
            };

            if (index === updatedBundles.length) {
                updatedBundles.push(bundleData);
                setLastDropdownValue("");
            } else {
                updatedBundles[index] = bundleData;
            }
        }

        setSelectedBundles(updatedBundles);
    };

    const handleRemove = (index) => () => {
        const updatedBundles = [...selectedBundles];
        updatedBundles.splice(index, 1);
        setSelectedBundles(updatedBundles);
    };

    return (
        <div>
            <h3>Parts simultànies</h3>
            <div>
                {
                    selectedBundles.map((bundle, index) => (
                        <div key={bundle.part_id} style={flexContainerStyle}>
                            <label>
                                {bundle.nom}
                                <Dropdown 
                                    bundles={availableBundles} 
                                    selectedValue={bundle.id} 
                                    onChange={handleSimultaniChange(index)} 
                                />
                            </label>
                            <button onClick={handleRemove(index)} style={buttonStyle}>Remove</button>
                        </div>
                    ))
                }
                <div style={flexContainerStyle}>
                    <Dropdown 
                        bundles={availableBundles} 
                        selectedValue={lastDropdownValue}  
                        onChange={handleSimultaniChange(selectedBundles.length)} 
                    />
                </div>
            </div>
        </div>
    );
}

export default SimultanisEditor;