import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { applyTimeZone } from '../../interface/assistencia/LlistaAssistencies';

// Register Chart.js and the annotation plugin
Chart.register(...registerables, annotationPlugin);

const AuthorHistogram = ({ data, nHours, castellersInfo, events }) => {

    const decodeBase64 = (encodedString) => {
        const uint8Array = Uint8Array.from(atob(encodedString), c => c.charCodeAt(0));
        const decodedString = new TextDecoder().decode(uint8Array);
        return decodedString;
    }

    const processData = (rawData) => {
        const nMinutesAgo = new Date(Date.now() - nHours * 60 * 60 * 1000);
        const filteredData = rawData.filter((entry) =>
        new Date(entry.timestamp) >= nMinutesAgo
        );
    
        // Create a map for time slots
        const timeSlots = Array.from({ length: nHours * 4 }, (_, index) => {
            const time = new Date(nMinutesAgo.getTime() + index * 15 * 60 * 1000);
            const day = time.getDate();
            const month = time.getMonth() + 1; // Months are 0-based in JavaScript
            const hour = time.getHours();
            const minute = Math.floor(time.getMinutes() / 15) * 15;
            return `${day}/${month} ${hour}:${minute.toString().padStart(2, '0')}`; // Ensure minutes are two digits
        });
    
        // Group data by author and then by time slot
        const groupedData = {};
        filteredData.forEach((entry) => {
            const entryDate = new Date(entry.timestamp);
            const day = entryDate.getDate();
            const month = entryDate.getMonth() + 1; // Months are 0-based in JavaScript
            const hour = entryDate.getHours();
            const minute = Math.floor(entryDate.getMinutes() / 15) * 15;
            const timeSlot = `${day}/${month} ${hour}:${minute.toString().padStart(2, '0')}`; // Ensure minutes are two digits
            const author = entry.author;
        
            if (!groupedData[author]) {
                groupedData[author] = Array(nHours * 4).fill(0); // n hours * 4 quarters of an hour
            }
            const slotIndex = timeSlots.indexOf(timeSlot);
            if (slotIndex !== -1) {
                groupedData[author][slotIndex]++;
            }
        });
    
        // Convert grouped data to Chart.js data format
        const datasets = Object.keys(groupedData).map((author) => {
            return {
                label: `${
                    castellersInfo[author]?.mote ? castellersInfo[author]?.mote :
                    author in castellersInfo ? `${castellersInfo[author]?.nom} ${castellersInfo[author]?.cognom}` :
                    author
                }`,
                data: groupedData[author],
                // You can customize each author's bar color here
                backgroundColor: `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.8)`,
            };
        });
    
        return { labels: timeSlots, datasets };
    };

    const chartData = processData(data);

    // Process events to get the start times within the selected nHours
    const eventsWithinNHours = events.filter(event => {
        const eventDate = applyTimeZone(event['data-esperada-inici']).toDate();
        const nHoursAgo = new Date(Date.now() - nHours * 60 * 60 * 1000);
        return new Date() > eventDate && eventDate > nHoursAgo;
    })

    const eventStartTimes = eventsWithinNHours
        .map(event => {
            const eventDate = applyTimeZone(event['data-esperada-inici']).toDate();
            return {
                value: `${eventDate.getDate()}/${eventDate.getMonth() + 1} ${eventDate.getHours()}:${eventDate.getMinutes().toString().padStart(2, '0')}`,
                time: eventDate.getTime(), // Store the time for sorting
                ...event
            };
        });


    // Sort events by time
    eventStartTimes.sort((a, b) => a.time - b.time);

    const eventsAnnotations = eventStartTimes.map(event => ({
        id: `event-${event.id}`,
        type: 'line',
        mode: 'vertical',
        scaleID: 'x',
        value: event.value,
        borderColor: 'red',
        borderWidth: 2,
        label: {
            rotation: 'auto',
            content: decodeBase64(event.title),
            display: true,
            position: 'start', // This will put the label at the top of the line
            font: {
                size: 6
            },
        },
    }))

    // Chart options with annotations
    const chartOptions = {
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true
            }
        },
        maintainAspectRatio: false,
        plugins: {
            annotation: {
                annotations: {
                    ...eventsAnnotations
                }
            }
        },
    };

    return (
        <>
            <div style={{ height: '400px', marginBottom: 75 }}>
                <h2>Activitat de cada membre durant les últimes {nHours} hores</h2>
                <Bar
                    data={chartData}
                    options={chartOptions}
                />
            </div>
        </>
    );
};

export default AuthorHistogram;
