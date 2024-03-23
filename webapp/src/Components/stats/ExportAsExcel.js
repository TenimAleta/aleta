import React from 'react';
import * as XLSX from 'xlsx';
import { applyTimeZone } from '../interface/assistencia/LlistaAssistencies';

function ExportAsExcel({ assistenciesDict, castellersInfo, filteredEvents, chosenUsers }) {
    const download = () => {
        const workbook = XLSX.utils.book_new();

        // Create a summary sheet
        const event_info = ['Esdeveniment', 'Inici', 'Fi'];
        const assistencies_types = ['Fitxat', 'Vinc', 'No confirmat', 'No vinc'];
        const summarySheet = XLSX.utils.aoa_to_sheet([event_info.concat(assistencies_types)]);
        const assistenciaCounts = {};

        filteredEvents.forEach(ev => {
            chosenUsers.forEach(id => {
                const assistencia = assistenciesDict?.[id]?.[ev.id] || 'No confirmat';
                if (!assistenciaCounts[ev.id]) assistenciaCounts[ev.id] = {};
                assistenciaCounts[ev.id][assistencia] = (assistenciaCounts?.[ev.id]?.[assistencia] || 0) + 1;
            });

            XLSX.utils.sheet_add_aoa(summarySheet, [
                // Event info
                [ev.title, applyTimeZone(ev['data-esperada-inici']).format('DD/MM/YYYY HH:mm:ss'), applyTimeZone(ev['data-esperada-fi']).format('DD/MM/YYYY HH:mm:ss')]
                // Assistència counts
                .concat(assistencies_types.map(type => assistenciaCounts?.[ev.id]?.[type] || 0))
            ], {origin: -1});
        });
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resum');

        // Create individual sheets for each event
        filteredEvents.forEach(ev => {
            const data = [
                ['Esdeveniment', 'Inici', 'Fi', 'Nom', 'Cognom', 'Segon Cognom', 'Assistència']
            ];

            const assists = chosenUsers.map(id => {
                const casteller = castellersInfo[id];
                const assistencia = assistenciesDict?.[casteller.id]?.[ev.id] || 'No confirmat';

                return [
                    ev.title,
                    applyTimeZone(ev['data-esperada-inici']).format('DD/MM/YYYY HH:mm:ss'),
                    applyTimeZone(ev['data-esperada-fi']).format('DD/MM/YYYY HH:mm:ss'),
                    casteller.nom,
                    casteller.cognom,
                    casteller['segon-cognom'] || '',
                    assistencia,
                ];
            });

            data.push(...assists);
            const sheet = XLSX.utils.aoa_to_sheet(data);
            const sheetname = `${applyTimeZone(ev['data-esperada-inici']).format('DD.MM.YYYY HH.mm')} ${ev.title}`;

            XLSX.utils.book_append_sheet(workbook, sheet, sheetname.substring(0, 31)); // Sheet title is limited to 31 characters
        });

        // Generate and download the .xlsx file
        const wbout = XLSX.write(workbook, {bookType:'xlsx', type: 'binary'});
        function s2ab(s) { 
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        const blob = new Blob([s2ab(wbout)], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'assistencies.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return chosenUsers.length > 0 && (
        <div style={{ display: 'flex', marginTop: 20 }}>
            <button style={{ flex: 1, fontSize: 16, padding: 15, backgroundColor: '#27b868' }} onClick={download}>
                📝 Exporta com a Excel els usuaris i esdeveniments triats
            </button>
        </div>
    );
}

export default ExportAsExcel;