import { useState } from "react";

function LastChanges({ lastCanvis, setNLastCanvis, bundles, displayName }) {

    const urlToBundle = url => {
        // Example input: https://aleta-arreplegats.s3.eu-west-3.amazonaws.com/positions/233783/0ea902c740.e0yzmnpr9hl.canvis?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQMYQJR7KQXMLMK5I%2F20231108%2Feu-west-3%2Fs3%2Faws4_request&X-Amz-Date=20231108T130706Z&X-Amz-Expires=3600&X-Amz-Signature=de8f61abadf2e446273195e63f65203581576030013c09168d3300c56d7ae877&X-Amz-SignedHeaders=host
        // Example output: 0ea902c740

        const bundleId = url?.split('/')?.[5]?.split('.')?.[0] ?? ''
        return bundles.find(bundle => bundle.id === bundleId).nom ?? bundleId
    }

    const urlToAletaURL = url => {
        // Example input: https://aleta-arreplegats.s3.eu-west-3.amazonaws.com/positions/233783/0ea902c740.e0yzmnpr9hl.canvis?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQMYQJR7KQXMLMK5I%2F20231108%2Feu-west-3%2Fs3%2Faws4_request&X-Amz-Date=20231108T130706Z&X-Amz-Expires=3600&X-Amz-Signature=de8f61abadf2e446273195e63f65203581576030013c09168d3300c56d7ae877&X-Amz-SignedHeaders=host
        // Example output: /233783/0ea902c740/e0yzmnpr9hl

        // Use URL object to parse the URL and handle query strings
        const parsedUrl = new URL(url);
        
        // Split the pathname into parts
        const pathSegments = parsedUrl.pathname.split('/');
        
        // Find the index where 'positions' is in the array
        const positionsIndex = pathSegments.indexOf('positions');
        
        // If 'positions' is not found, or there are not enough segments following 'positions', return an empty string
        if (positionsIndex === -1 || positionsIndex > pathSegments.length - 3) {
            return '';
        }
        
        // Extract the two segments following 'positions' and the file name without extension
        const id = pathSegments[positionsIndex + 1];
        let file = pathSegments[positionsIndex + 2];
        const fileParts = file.split('.');
        
        // If the file has an extension, remove it
        if (fileParts.length > 1) {
            fileParts.pop();
            file = fileParts.join('.');
        }

        const fileToSlashes = file.replace(/\./g, '/');
        
        // Return the formatted string
        return `/${id}/${fileToSlashes}/edit`;
    };

    const packChanges = (changes) => {
        const packedChanges = [];
        let i = 0;
      
        while (i < changes.length) {
          const change = changes[i];
          let count = 1;
          let individualChanges = [change];
      
          // Look ahead to see if the next change is by the same author and has the same URL
          while (i + count < changes.length &&
                 changes[i + count].author === change.author &&
                 changes[i + count].url === change.url) {
            individualChanges.push(changes[i + count]);
            count++;
          }
      
          // Push the packed change to the array
          packedChanges.push({ ...change, count: count, individualChanges: individualChanges });
      
          // Skip over the changes that were packed
          i += count;
        }
      
        return packedChanges;
    };      

    const [selectedChange, setSelectedChange] = useState(null);

    return (
        <div
            style={{
                paddingBottom: 50,
            }}
        >
            <h2>Últims canvis</h2>
            <div style={{ listStyleType: 'none', padding: 0 }}>
            {
                packChanges(lastCanvis)
                    .flatMap((change, index) => [
                        <div onClick={() => setSelectedChange(prev => JSON.stringify(prev) === JSON.stringify(change) ? null : change)} key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '5px', padding: '10px', backgroundColor: '#f9f9f9' }}>
                            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{displayName(change.author)}</span>
                            <span style={{ color: '#888' }}>{new Date(change.timestamp).toLocaleString()}</span>
                            <a target="_blank" href={urlToAletaURL(change.url)} style={{ marginLeft: '10px', color: '#007bff' }}>{urlToBundle(change.url)}</a>
                            <a style={{ marginLeft: '10px' }}>{change.count} canvis</a>
                        </div>,
                        JSON.stringify(selectedChange) === JSON.stringify(change) && change.individualChanges.map((individualChange, i) => (
                            <div key={i} style={{ marginLeft: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9f9ef9', borderRadius: '5px', marginBottom: '10px' }}>
                                { individualChange.casteller !== '_EMPTY_' && <span>Ha posat {displayName(individualChange.casteller)}</span> }
                                { individualChange.casteller === '_EMPTY_' && <span>Ha buidat una caixa</span> }
                                <span style={{ color: '#888', marginRight: '10px' }}>{new Date(individualChange.timestamp).toLocaleString()}</span>
                            </div>
                        ))
                    ])
            }
            </div>
            <button onClick={() => setNLastCanvis(prev => prev + 100)} style={{ marginTop: '20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', padding: '10px 20px', cursor: 'pointer' }}>
                Mostra'n més +
            </button>
        </div>
    )
}

export default LastChanges;