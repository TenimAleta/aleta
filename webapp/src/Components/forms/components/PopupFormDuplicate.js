import { useState } from "react";
import { applyTimeZone } from "../../interface/assistencia/LlistaAssistencies";
import Popup from "../../other/Popup";
import { useEffect } from "react";

const idToName = {
    'multiple-choice': 'Selecció múltiple',
    checkbox: 'Vàries opcions',
    'short-answer': 'Resposta curta',
    paragraph: 'Paràgraf',
    'image-upload': 'Pujar imatge',
    'copiable-text': 'Text copiable',
    image: 'Imatge',
    'resum-pagaments': 'Resum pagaments',
    ticket: 'Pagament',
    text: 'Text',
}

function ElementInfo({ element, idsToDuplicate, setIdsToDuplicate }) {
    const question = element.type !== 'text' ? element.content.question : element.content

    return (
        <div style={{ display: 'flex', margin: '10px 0', alignItems: 'center' }}>
            <input
                id={`checkbox-${element.id}`}
                type="checkbox"
                checked={idsToDuplicate.includes(element.id)}
                onChange={() => {
                    if (idsToDuplicate.includes(element.id)) {
                        setIdsToDuplicate(idsToDuplicate.filter(id => id !== element.id))
                    } else {
                        setIdsToDuplicate([...idsToDuplicate, element.id])
                    }
                }}
            />
            <label htmlFor={`checkbox-${element.id}`} style={{ display: 'flex', alignItems: 'center', color: 'grey', fontSize: '14px', cursor: 'pointer', gap: 5 }}>
                { question && <div style={{ cursor: 'pointer' }}>{question}</div> }
                <div style={{ padding: '2px 4px', fontSize: 10, backgroundColor: '#6495ED', color: 'white', borderRadius: 5 }}>{idToName[element.type]}</div>
            </label>
        </div>
    )
}

function FormInfo({ ev, form, handleClick, idsToDuplicate, setIdsToDuplicate}) {
    return (
        <div
            style={{ padding: '20px', borderBottom: '1px solid #ccc' }}
        >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                <div>
                    <input
                        id={`duplicate-all-${ev.id}`}
                        type="checkbox"
                        checked={form.elements.length > 0 && form.elements.every(el => idsToDuplicate.includes(el.id))}
                        disabled={form.elements.length === 0}
                        style={{ transform: 'scale(1.25)' }}
                        onChange={() => {
                            if (form.elements.every(el => idsToDuplicate.includes(el.id))) {
                                setIdsToDuplicate([])
                            } else {
                                setIdsToDuplicate(form.elements.map(el => el.id))
                            }
                        }}
                    />
                </div>
                <label htmlFor={`duplicate-all-${ev.id}`} style={{ cursor: 'pointer' }}>
                    <h3 style={{ color: '#333', marginBottom: '5px' }}>
                        {
                            (form.title && ev.title) ? `${form.title} (${ev.title})` :
                            (form.title || ev.title)
                        }
                    </h3>
                    <p style={{ color: '#666', fontSize: '12px' }}>{applyTimeZone(ev?.['data-esperada-inici']).format('DD/MM/YYYY HH:mm')}</p>
                </label>
            </div>

            <div
                style={{
                    marginLeft: '30px',
                }}
            >
                {
                    form.elements
                        .sort((a, b) => form.order.indexOf(a.id) > form.order.indexOf(b.id) ? 1 : -1)
                        .map(el => <ElementInfo key={el.id} element={el} idsToDuplicate={idsToDuplicate} setIdsToDuplicate={setIdsToDuplicate} />)
                }
            </div>

            {form.elements.length > 0 && idsToDuplicate.some(id => form.elements.map(el => el.id).includes(id)) && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                    <button onClick={() => handleClick(ev.id)} style={{ cursor: 'pointer', padding: '10px 25px' }}>
                        Importar preguntes
                    </button>
                </div>
            )}
        </div>
    )
}

function PopupFormDuplicate({ closed, setClosed, forms, events, duplicateForm, selectedEvent }) {
    const [idsToDuplicate, setIdsToDuplicate] = useState({})
    const [showMore, setShowMore] = useState(10)

    const eventsWithForms = events
        .filter(ev => ev.id !== selectedEvent)
        .filter(ev => ev.id in forms)

    const handleClick = (evId) => {
        duplicateForm(evId, Object.values(idsToDuplicate).flat())
        setClosed(true)
    }

    return (
        <Popup
            closed={closed}
            setClosed={setClosed}
        >
            {
                eventsWithForms
                    .sort((a, b) => applyTimeZone(b['data-esperada-inici']).diff(applyTimeZone(a['data-esperada-inici'])))
                    .slice(0, showMore)
                    .map(ev => (
                        <FormInfo
                            key={ev.id}
                            ev={ev}
                            form={forms[ev.id]}
                            handleClick={handleClick}
                            idsToDuplicate={idsToDuplicate[ev.id] || []}
                            setIdsToDuplicate={ids => setIdsToDuplicate({ ...idsToDuplicate, [ev.id]: ids })}
                        />
                    ))
            }

            {eventsWithForms.length > showMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button onClick={() => setShowMore(showMore + 10)} style={{ cursor: 'pointer', padding: '10px 25px' }}>
                        Mostrar més
                    </button>
                </div>
            )}
        </Popup>
    )
}

export default PopupFormDuplicate;