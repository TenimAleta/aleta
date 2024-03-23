import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

function toNumeralMonth(str) {
    const normalized = str.toLowerCase().replace('.', '')

    const monthMap = {
        gen: 1, ene: 1, feb: 2, febr: 2, mar: 3, març: 3, abr: 4, may: 5, maig: 5, jun: 6, juny: 6, jul: 7, ago: 8, ag: 8, set: 9, sept: 9, oct: 10, nov: 11, dic: 12, des: 12
    };

    const matchedMonth = Object.keys(monthMap)
        .find(key => normalized.startsWith(key))

    return monthMap[matchedMonth] || null;
}

function dateMatch(ocrText) {
    const standardRegex = /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/;
    const stringRegex = /(\d{1,2}) (?:de )?(ene[a-z]*\.?|feb[a-z]*\.?|mar[a-z]*\.?|abr[a-z]*\.?|may[a-z]*\.?|jun[a-z]*\.?|jul[a-z]*\.?|ago[a-z]*\.?|set[a-z]*\.?|oct[a-z]*\.?|nov[a-z]*\.?|dic[a-z]*\.?|gen[a-z]*\.?|febr[a-z]*\.?|març[a-z]*\.?|maig[a-z]*\.?|juny[a-z]*\.?|jul[a-z]*\.?|ag[a-z]*\.?|sept[a-z]*\.?|des[a-z]*\.?) (?:de )?(\d{4})/i;

    const standardMatch = ocrText.match(standardRegex);
    const stringMatch = ocrText.match(stringRegex);

    if (standardMatch) {
        return `${standardMatch[1]}/${standardMatch[2]}/${standardMatch[3]}`;
    } else if (stringMatch) {
        return `${stringMatch[1]}/${toNumeralMonth(stringMatch[2]).toString().padStart(2, '0')}/${stringMatch[3]}`;
    } else {
        return null;
    }
}

function importMatch(ocrText) {
    const importRegex = /(?!\b0+[,.]00\b)\b(\d+)[,.](\d{2})\b(?![,.])(?: EUR)?/;
    const importMatch = ocrText.match(importRegex);

    return importMatch ? `${parseInt(importMatch[1])},${importMatch[2]}€` : null;
}

// Function to extract the date and import, then compare to expected values
function checkTransaction(ocrText) {
    // Extract date and import
    const dateVal = dateMatch(ocrText)
    const importVal = importMatch(ocrText)

    return {
        date: dateVal ? dateVal : null,
        import: importVal ? importVal : null,
    };
}

function useScheduler() {
    const scheduler = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        scheduler.current = Tesseract.createScheduler();
    }, []);

    // Creates worker and adds to scheduler
    const workerGen = async () => {
        const worker = await Tesseract.createWorker("cat+spa", 1, {
            // logger: function(m){console.log(m);}
        });
        
        scheduler.current.addWorker(worker);
    };

    useEffect(() => {
      if (scheduler.current) {
        const workerN = 4;
        (async () => {
          const resArr = Array(workerN);
          for (let i=0; i<workerN; i++) {
            resArr[i] = await workerGen();
          }
          setReady(true);
        })();
      }
    }, [
      scheduler,
    ]);

    const recognizeImage = async (imgURL) => {
        if (!ready) throw new Error('Scheduler not ready');
        if (!imgURL) throw new Error('No image URL');

        return new Promise((resolve, reject) => {
            scheduler
                .current
                .addJob('recognize', imgURL)
                .then((x) => resolve(checkTransaction(x.data.text)))
                .catch(reject);
        })
    }

    return {
        ready,
        scheduler,
        recognize: ready ? recognizeImage : null,
    }
}

export default useScheduler;