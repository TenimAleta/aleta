import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MultipleChoiceQuestion, CheckboxQuestion, ShortAnswerQuestion, ParagraphQuestion, TextElement, ImageUploadQuestion, ImageUploadQuestionPreview, CopiableTextQuestionPreview, CopiableTextQuestion, TicketQuestionPreview, TicketQuestion, ResumPagamentsQuestionPreview, ResumPagamentsQuestion, ImagePreview, ImageElement } from './FormElements';
import { MultipleChoiceQuestionPreview, CheckboxQuestionPreview, ShortAnswerQuestionPreview, ParagraphQuestionPreview, TextElementPreview } from './FormElements';
import './FormEditorStyles.css';
import '../notifications/notifications.css'

import Styled from "styled-components";
import List from '../../utils/draggable-list';

import TimePickerDialog from '../other/TimePickerDialog';
import moment from 'moment';
import { applyTimeZone, applyInverseTimeZone } from '../interface/assistencia/LlistaAssistencies';
import { fetchAPI, fetchAPIquery, postAPI } from '../../utils/utils';
import Popup from '../other/Popup';
import PopupFormDuplicate from './components/PopupFormDuplicate';

function DragHandle(props) {
    return (
        <div {...props} style={{ display: 'flex', justifyContent: 'space-evenly', flex: 1 }}>
            <div style={{ color: 'gray', fontSize: 28, backgroundColor: '#ccc', color: 'white', paddingLeft: 10, paddingRight: 10, borderRadius: 5, alignItems: 'center', display: 'flex' }}>
              ···
            </div>
        </div>
    )
}

const PreguntaItem = Styled.div`
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    border: solid 1px #ccc;
    border-radius: 5px;
    background-color: white;
`

const getTimeDiff = (start, end) => {
  const diff = Math.ceil(end.diff(start, 'minutes', true))
  const days = Math.floor(diff / (24*60));
  const hours = Math.floor((diff - days*24*60) / 60);
  const minutes = Math.floor(diff - days*24*60 - hours*60);

  if (diff >= 2*24*60) {
    return `${days} dies` + (hours > 0 ? ` i ${hours} hores` : '');
  } else if (diff >= 24*60) {
    return `1 dia` + (hours > 0 ? ` i ${hours} hores` : '');
  } else if (diff >= 2*60) {
    return `${hours} hores` + (minutes > 0 ? ` i ${minutes} minuts` : '');
  } else if (diff >= 60) {
    return `1 hora` + (minutes > 0 ? ` i ${minutes} minuts` : '');
  } else if (diff > 1) {
    return `${minutes} minuts`;
  } else if (diff === 1) {
    return `1 minut`;
  } else {
    return `alhora`;
  }
};

const FormPreview = ({ hidden, required, title, description, elements, order, socket, selectedEvent, notification, setNotification }) => {
  const sortedElements = elements.sort((a, b) => order.indexOf(a.id) > order.indexOf(b.id) ? 1 : -1);

  const ComponentMap = {
    'multiple-choice': MultipleChoiceQuestionPreview,
    checkbox: CheckboxQuestionPreview,
    'short-answer': ShortAnswerQuestionPreview,
    paragraph: ParagraphQuestionPreview,
    'image-upload': ImageUploadQuestionPreview,
    'copiable-text': CopiableTextQuestionPreview,
    image: ImagePreview,
    'resum-pagaments': ResumPagamentsQuestionPreview,
    ticket: TicketQuestionPreview,
    text: TextElementPreview,
  };

  const renderedElements = sortedElements.map((element, index) => {
    const Component = ComponentMap[element.type];
    return <Component
      key={index}
      element={element}
      selectedEvent={selectedEvent}
    />;
  });

  return (
    <div className="form-preview">
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          {
            hidden ? <em>🔒 Ocult</em> :
            <em>🌐 Visible</em>
          }
        </div>
        <div>
          <input type="checkbox" checked={required} disabled />
          <em>Obligatori</em>
        </div>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {renderedElements}
    </div>
  );
};

function MockupNotification({ ...props }) {
  // Create a HTML mockup of an Apple Push Notification
  const { title, body, data } = props;

  const notification_style = {
      width: '95%',
      backgroundColor: 'rgb(245,245,245)',
      borderRadius: '10px',
      boxShadow: '0 0 10px 0 rgba(0,0,0,0.5)',
      padding: '10px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
  };

  const notification_title_text_style = {
      fontSize: '1em',
      fontWeight: 'bold',
      color: 'black',
  };

  const notification_body_text_style = {
      fontSize: '0.8em',
      color: 'black',
  };

  const notification_icon_style = {
      width: '50px',
      height: '50px',
      borderRadius: 10,
      backgroundColor: 'white',
  };

  return (
      <div style={notification_style}>
          <div style={{ padding: 10 }}>
              <img style={notification_icon_style} src="/aleta-icon.png" alt="icon" />
          </div>
          <div style={{ padding: 10 }}>
              <div style={notification_title_text_style}>{title}</div>
              <div style={notification_body_text_style}>{body}</div>
          </div>
      </div>
  );
}

const NotifyAlreadyVenen = ({ userInfo, socket, selectedEvent, castellersInfo, formTitle, selectedDay }) => {
  const [sendingState, setSendingState] = useState(null);
  const [progressText, setProgressText] = useState('');

  const [assistencies, setAssistencies] = useState([]);
  const [responses, setResponses] = useState([]);

  const defaultTitle = '{nom}, tens pendent un formulari';
  const defaultBody = `Has dit que vens, però et falta respondre "{titol}".`;

  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);

  const [collapseNotification, setCollapseNotification] = useState(true);

  useEffect(() => {
      fetchAPI(`/assistencies_event/${selectedEvent}`, data => {
        setAssistencies(data.data)
      })

      socket.emit('.request_form_responses', selectedEvent)

      socket.on('.form_responses', (res) => {
          if (res.evId === selectedEvent) {
              // setResponses(Object.values(res.responses))
              setResponses(Object.keys(res.responses))
          }
      })

      return () => {
          socket.off('.assistencies_event');
          socket.off('.form_responses');
      }
  }, [selectedEvent]);

  const venenAndNoResponse = assistencies
      .filter(row => row.assistencia === 'Vinc')
      .filter(row => !responses.map(id => parseInt(id)).includes(row.id))

  const format_text = (text, id) => {
      const nom = id in castellersInfo ?
          castellersInfo[id].nom
          : ''

      const sobrenom = id in castellersInfo ?
          castellersInfo[id].mote ? castellersInfo[id].mote :
          castellersInfo[id].nom ? castellersInfo[id].nom :
          ''
      : ''

      return text
          .replaceAll(' {nom}', nom !== '' ? ` ${nom}` : '')
          .replaceAll('{nom}', nom !== '' ? nom : '')
          .replaceAll(' {sobrenom}', sobrenom !== '' ? ` ${sobrenom}` : '')
          .replaceAll('{sobrenom}', sobrenom !== '' ? sobrenom : '')
          .replaceAll(' {titol}', formTitle !== '' ? formTitle : '')
          .replaceAll('{titol}', formTitle !== '' ? formTitle : '')
  }

  const notifica_users = (users) => {
    const notification_id = uuidv4();

    users.forEach(uid => 
        socket.emit('.send_notification_to_user',
            uid,
            {
                title: format_text(title, uid),
                body: format_text(body, uid),
                data: { selectedDay: selectedDay },
                notification_id: notification_id,
                author: userInfo.id,
            }
        )
    )
  }

  useEffect(() => {
    let interval = null;

    if (sendingState === 'sending') {
      const total = venenAndNoResponse.length;
      let count = 0;
      interval = setInterval(() => {
        count++;
        setProgressText(`Enviant notificació a ${count} castellers... (de ${total} totals)`);
        if (count === total) {
          setSendingState('sent');
          clearInterval(interval);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [sendingState, venenAndNoResponse.length]);

  const withNotis = venenAndNoResponse.filter(row => row.has_notifications)
  const withoutNotis = venenAndNoResponse.filter(row => !row.has_notifications)

  const [loopIndex, setLoopIndex] = useState(0)

  const shortDisplayName = id => castellersInfo[id].mote ? castellersInfo[id].mote : `${castellersInfo[id].nom} ${castellersInfo[id].cognom}`

  return venenAndNoResponse.length > 0 ? (
    <div>
      <div style={{ backgroundColor: '#eee', borderRadius: 10, marginBottom: 20, padding: 20 }}>
          <h3>Notifica als que venen i no han respost</h3>

          {
            collapseNotification ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                  {
                    venenAndNoResponse.map(row => (
                      <div
                        key={row.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#fff',
                          borderRadius: 5,
                          padding: 5,
                          margin: 3,
                          fontSize: 11,
                        }}
                      >
                        {
                          shortDisplayName(row.id)
                        }
                      </div>
                    ))
                  }
                </div>
                
                {
                  sendingState === 'sent' ? (
                    <div style={{ marginTop: 20, padding: 10 }}>
                    {(withNotis.length === 1) && <p style={{ fontSize: 16 }}>✅&nbsp;&nbsp;&nbsp;&nbsp;Notificació enviada correctament a <strong>{withNotis.length}</strong> casteller.</p>}
                    {(withNotis.length > 1) && <p style={{ fontSize: 16 }}>✅&nbsp;&nbsp;&nbsp;&nbsp;Notificació enviada correctament a <strong>{withNotis.length}</strong> castellers.</p>}
                    {(withoutNotis.length === 1) && <p style={{ fontSize: 16 }}>😔&nbsp;&nbsp;&nbsp;&nbsp;<strong>{withoutNotis.length}</strong> casteller no té l'app o no té les notificacions activades.</p>}
                    {(withoutNotis.length > 1) && <p style={{ fontSize: 16 }}>😔&nbsp;&nbsp;&nbsp;&nbsp;<strong>{withoutNotis.length}</strong> castellers no tenen l'app o no tenen les notificacions activades.</p>}
                    </div>
                  ) : sendingState === 'sending' ? (
                    <div style={{ marginTop: 20, padding: 10 }}>
                      <p style={{ fontSize: 16 }}>{progressText || 'Preparant notificació...'}</p>
                      <div className="loading" />
                      <div style={{ margin: '1rem' }} />
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        style={{
                          cursor: 'pointer',
                          width: '100%',
                          fontSize: 14,
                          backgroundColor: 'lightgreen',
                          color: '#333',
                          flex: 4,
                        }}
                        onClick={() => {
                          notifica_users(venenAndNoResponse.map(row => row.id));
                          setSendingState('sending');
                        }}
                      >
                        Envia a {venenAndNoResponse.length} castellers
                      </button>

                      <button
                        onClick={() => setCollapseNotification(false)}
                        style={{ flex: 1, borderRadius: 5, fontSize: 12, padding: 10, backgroundColor: 'lightblue', color: '#333', cursor: 'pointer' }}
                      >
                        Edita la notificació
                      </button>
                    </div>
                  )
                }
              </div>
            ) : (
              <>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
                  {
                    venenAndNoResponse.map(row => (
                      <div
                        key={row.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#fff',
                          borderRadius: 5,
                          padding: 5,
                          margin: 3,
                          fontSize: 11,
                        }}
                      >
                        {
                          shortDisplayName(row.id)
                        }
                      </div>
                    ))
                  }
                </div>

            <button
                onClick={() => setCollapseNotification(true)}
                style={{ width: '100%', backgroundColor: 'lightblue', color: '#333', borderRadius: 5, fontSize: 12, cursor: 'pointer', marginBottom: 15 }}
              >
                Amaga opcions d'editar
              </button>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`(Proposta:) ${defaultTitle}`} style={{ width: '98%', marginBottom: 10, fontSize: 14, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', padding: 5 }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={`(Proposta:) ${defaultBody}`} style={{ width: '100%', fontSize: 12 }} />    
          <p style={{ fontSize: 10 }}>Pots utilitzar: <span style={{ color: 'darkblue' }}>{['{nom}', '{sobrenom}', '{titol}'].join(', ')}</span> als textos de la notificació.</p>

          <div style={{ marginBottom: 20 }}>
              <p style={{ flex: 1, fontSize: 12 }}>Aquesta és la notificació que rebran els {venenAndNoResponse.length} usuaris seleccionats. Si no estàs segur/a, prova a enviar-la a un grup petit de persones.</p>

              <div style={{ display: "flex", flexDirection: 'row' }}>
                  <div
                      style={{ flex: 1, fontSize: 14, textAlign: 'center', color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                      onClick={() => setLoopIndex(prev => (prev - 1 + venenAndNoResponse.length)%venenAndNoResponse.length)}    
                  >Casteller anterior</div>
                  <div
                      style={{ flex: 1, fontSize: 14, textAlign: 'center', color: '#777', padding: 5, borderColor: '#777', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
                      onClick={() => setLoopIndex(prev => (prev + 1)%venenAndNoResponse.length)}    
                  >Següent casteller</div>
              </div>
          </div>

          <MockupNotification
              title={format_text(title || defaultTitle, venenAndNoResponse[loopIndex%venenAndNoResponse.length].user)}
              body={format_text(body || defaultBody, venenAndNoResponse[loopIndex%venenAndNoResponse.length].user)}
          />

          <button
            style={{
              cursor: 'pointer',
              marginTop: '1rem',
              width: '100%',
              fontSize: 16,
              backgroundColor: 'lightgreen',
              color: '#333',
            }}
            onClick={() => {
              notifica_users(venenAndNoResponse.map(row => row.user));
              setSendingState('sending');
            }}
          >
            Envia a {venenAndNoResponse.length} castellers
          </button>
            </>
          ) }
        </div>
    </div>
  ) : (
    null
  )

} 

const FormEditor = ({ forms, events, userInfo, selectedDay, castellersInfo, readonly, socket, selectedEvent, notification, setNotification, preview, setPreview }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [elements, setElements] = useState([]);
  const [errors, setErrors] = useState({});
  const [modeReorder, setModeReorder] = useState(false);
  const [order, setOrder] = useState([]);
  const [showLoadSaveButtons, setShowLoadSaveButtons] = useState(false);
  const [isNew, setIsNew] = useState(null);
  const [required, setRequired] = useState(null);
  const [hidden, setHidden] = useState(false);

  const handleTitleChange = (newTitle) => setTitle(newTitle);
  const handleDescriptionChange = (newDescription) => setDescription(newDescription);

  const [openOpeningDateDialog, setOpenOpeningDateDialog] = useState(false);
  const [openClosingDateDialog, setOpenClosingDateDialog] = useState(false);
  const [openingDate, setOpeningDate] = useState(null);
  const [closingDate, setClosingDate] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  const addElement = (elementType) => {
    const ID = uuidv4();
    const type = elementType === 'comprovant-upload' ? 'image-upload' : elementType;

    setElements([
      ...elements,
      {
        id: ID,
        type: type,
        content:
          type === 'text' ? '' :
          type === 'ticket' ? { question: '', options: ['', ''] } :
          { question: '', options: [''] },
        required: (elementType === 'comprovant-upload' || type === 'ticket') ? true : false,
        isComprovant: elementType === 'comprovant-upload',
      },
    ]);

    setOrder([...order, ID]);
  };

  const updateElement = (id, updatedElement) => {
    setElements(
      elements.map((element, i) => (element.id === id ? updatedElement : element)),
    );
  };

  const removeElement = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest element?')) {
      setElements(elements.filter(el => el.id !== id));
      setOrder(order.filter(el_id => el_id !== id));

      return true;
    } else {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};
  
    elements.forEach((element, index) => {
      if (element.type !== 'image' && element.type !== 'resum-pagaments' && element.type !== 'text' && element.content.question.trim() === '') {
        newErrors[index] = { question: 'El títol de la pregunta no pot estar buit.' };
      }
      if (element.type === 'multiple-choice' || element.type === 'checkbox' || element.type === 'ticket') {
        element.content.options.forEach((option, optionIndex) => {
          if (option.trim() === '') {
            if (!newErrors[index]) {
              newErrors[index] = {};
            }
            newErrors[index][`option_${optionIndex}`] = "L'opció no pot estar buida, borra-la.";
          }
        });
      }
      if (element.type === 'text' && element.content.trim() === '') {
        newErrors[index] = { text: 'El text no pot estar buit.' };
      }
    });
  
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    socket.emit('.load_form', selectedEvent);

    socket.on('.loaded_form', (loadedData) => {
      setTitle(loadedData.title);
      setDescription(loadedData.description);
      setElements(loadedData.elements);
      setOrder(loadedData.order);
      setIsNew(!!loadedData?.new);
      setRequired('required' in loadedData ? loadedData.required : true);
      setOpeningDate(loadedData.openingDate ? moment(loadedData.openingDate) : null);
      setClosingDate(loadedData.closingDate ? moment(loadedData.closingDate) : null);

      setTimeout(() => {
        setShowLoadSaveButtons(false);
      }, 500);
    });
  
    socket.on('.form_deleted', () => {
      socket.emit('.load_form', selectedEvent);
    });                                                  

    return () => {
      socket.off('.loaded_form');
      socket.off('.form_deleted');
    };
  }, [
    selectedEvent,
  ]);

  const selectedEventTitle = events
    ?.find(ev => ev.id === selectedEvent)
    ?.title

  useEffect(() => {
    socket.on('.form_saved', res => {
      if (res.success) {
        const defaultTitle =
          title ? `{nom}, hem canviat "${title}"` :
          selectedEventTitle ? `{nom}, hem canviat el formulari de "${selectedEventTitle}"` :
          `{nom}, hem canviat un formulari`

        const defaultBody =
          title ? `El formulari "${title}", que ja has respós, té noves preguntes. Si us plau, torna a respondre'l` :
          selectedEventTitle ? `El formulari de "${selectedEventTitle}", que ja has respós, té noves preguntes. Si us plau, torna a respondre'l` :
          `Un formulari que ja has respós té noves preguntes. Si us plau, torna a respondre'l`

        setNotification({
          msg: 'Formulari guardat correctament.',
          link: `/notifications?ev=${selectedEvent}&subgroup=venen&titol=${encodeURIComponent(defaultTitle)}&missatge=${encodeURIComponent(defaultBody)}`,
          linkText: 'Notifica el canvi als que ja han respós ↗',
          timeout: 5000,
        })
      } else {
        setNotification({
          msg: 'Algo ha fallat. Formulari guardat incorrectament...'
        })
      }
    })

    return () => {
      socket.off('.form_saved');
    }
  }, [
    selectedEvent,
    title,
  ])
  
  useEffect(() => {
    const invalidDates = openingDate?.isValid() && closingDate?.isValid() && openingDate.isAfter(closingDate)
    if (!invalidDates) setShowLoadSaveButtons(true);
    else setShowLoadSaveButtons(false);
  }, [hidden, title, description, elements, order, required, openingDate, closingDate]);

  const saveForm = (force=true) => {
    if (validateForm()) {
      const formData = {
        title,
        description,
        elements,
        order,
        required,
        hidden,
        openingDate: (openingDate && openingDate?.isValid()) ? openingDate?.toISOString() : null,
        closingDate: (closingDate && closingDate?.isValid()) ? closingDate?.toISOString() : null,
      };

      socket.emit('.force_save_form', formData, selectedEvent);
      setShowLoadSaveButtons(false);
      
      socket.emit('.request_form_responses', selectedEvent)
      socket.emit('.load_form', selectedEvent)
    } else {
      alert('Hi ha errors al formulari. Revisa els missatges d\'error i torna a intentar-ho.')
    }
  };
  
  const loadForm = () => {
    socket.emit('.load_form', selectedEvent);
  };

  const deleteForm = () => {
    const confirmation = window.confirm('Estàs segur que vols eliminar el formulari? No es podrà recuperar.');
    if (confirmation) {
      // Remove all tickets
      elements
        .filter(element => element.type === 'ticket')
        .forEach(element => postAPI('/remove_tiquet', { id: element.id }, () => {}))

      socket.emit('.delete_form', selectedEvent);
    }
  };

  const ElementsToEdit = [...elements]
    .sort((a, b) => order.indexOf(a.id) > order.indexOf(b.id) ? 1 : -1)
    .map((element, index) =>
            <FormElement
                key={index}
                element={element}
                updateElement={(updatedElement) => updateElement(element.id, updatedElement)}
                removeElement={() => removeElement(element.id)}
                errors={errors[index] || {}}
                selectedEvent={selectedEvent}
            />
        )

  const [closedDuplicateFormPopup, setClosedDuplicateFormPopup] = useState(true);
        
  const duplicateForm = (fromEvent, idsToDuplicate=[]) => {
    if (fromEvent) {
      postAPI(
        `/duplicate_form/${fromEvent}/${selectedEvent}`,
        { idsToDuplicate },
        data => { socket.emit('.load_form', selectedEvent) }
      )
    }
  }

  return readonly ? (
    <FormPreview
        title={title}
        description={description}
        elements={elements}
        hidden={hidden}
        order={order}
        socket={socket}
        selectedEvent={selectedEvent}
        notification={notification}
        setNotification={setNotification}
        required={required}
    />
  ) : isNew === null ? (
    <div>
      <h4>Carregant...</h4>
    </div>
  ) : (isNew && preview) ? (
    <div>
      <PopupFormDuplicate
        closed={closedDuplicateFormPopup}
        setClosed={setClosedDuplicateFormPopup}
        events={events}
        forms={forms}
        duplicateForm={duplicateForm}
        selectedEvent={selectedEvent}
      />

      <h2>Crea un formulari</h2>
      <button
        onClick={() => setPreview(false)}
        style={{
          cursor: 'pointer',  
          marginBottom: '1rem',
          width: '100%',
          fontSize: 16,
        }}
      >
        + Crea un formulari
      </button>
      <button
        onClick={() => setClosedDuplicateFormPopup(false)}
        style={{
          cursor: 'pointer',  
          marginBottom: '1rem',
          width: '100%',
          fontSize: 16,
        }}
      >
        + Importar preguntes d'un altre formulari
      </button>
    </div>
  ) :
  preview ? (
    <div>
      <h2>Previsualització del formulari</h2>
      <NotifyAlreadyVenen
        socket={socket}
        castellersInfo={castellersInfo}
        formTitle={title}
        selectedDay={selectedDay}
        selectedEvent={selectedEvent}
        userInfo={userInfo}
      />

      <button
        onClick={() => setPreview(false)}
        style={{
          cursor: 'pointer',
          marginBottom: '1rem',
          width: '100%',
          fontSize: 16,
        }}
      >
        📝 Editar formulari
      </button>

      <FormPreview
        title={title}
        description={description}
        elements={elements}
        order={order}
        socket={socket}
        selectedEvent={selectedEvent}
        notification={notification}
        setNotification={setNotification}
        required={required}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button
          className='delete-button'
          onClick={deleteForm}
        >
          Esborra el formulari
        </button>
      </div>
    </div>
  ) :
  (
    <div>
      <PopupFormDuplicate
        closed={closedDuplicateFormPopup}
        setClosed={setClosedDuplicateFormPopup}
        events={events}
        forms={forms}
        duplicateForm={duplicateForm}
        selectedEvent={selectedEvent}
      />

      <h2>{isNew ? 'Crea un' : 'Edita el'} formulari</h2>
  
      {
        !isNew && (
          <NotifyAlreadyVenen
            socket={socket}
            castellersInfo={castellersInfo}
            formTitle={title}
            selectedDay={selectedDay}
            selectedEvent={selectedEvent}
          />
        )
      }

      <button
        onClick={() => setPreview(true)}
        style={{
          cursor: 'pointer',
          marginBottom: '1rem',
          width: '100%',
          fontSize: 16,
          backgroundColor: '#eee',
          color: 'black'
        }}
      >
        {
          !isNew ? <>👁️ Previsualitza el formulari</> :
          <>🚫 Cancel·lar la creació</>
        }
      </button>

      <TitleInput title={title} handleTitleChange={handleTitleChange} />
      <DescriptionInput description={description} handleDescriptionChange={handleDescriptionChange} />

      <TimePickerDialog
        onConfirm={(date) => setOpeningDate(prevDate => {
          const [HH, MM] = date.split(':').map((n) => parseInt(n, 10));
          return moment(prevDate)
            .hour(HH)
            .minute(MM)
        })}
        title="Tria la data d'obriment"
        openDialog={openOpeningDateDialog}
        setOpenDialog={setOpenOpeningDateDialog}
      />

      <TimePickerDialog
        onConfirm={(date) => setClosingDate(prevDate => {
          const [HH, MM] = date.split(':').map((n) => parseInt(n, 10));
          return moment(prevDate)
            .hour(HH)
            .minute(MM)
        })}
        title="Tria la data de tancament"
        openDialog={openClosingDateDialog}
        setOpenDialog={setOpenClosingDateDialog}
      />

      <h3>Tria la data d'obriment i tancament</h3>

      {
        openingDate?.isValid() && closingDate?.isValid() && openingDate.isAfter(closingDate) && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            El formulari no pot tancar { getTimeDiff(closingDate, openingDate) } abans d'obrir-se.
          </div>
        )
      }

      {
        openingDate?.isValid() && closingDate?.isValid() && openingDate.isBefore(closingDate) && (
          <div style={{ color: 'green', marginBottom: '1rem' }}>
            El formulari estarà obert { getTimeDiff(openingDate, closingDate) }
          </div>
        )
      }

      <div style={{ gap: 20, marginBottom: '1rem', display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
        <div>Obriment</div>
        <div>Tancament</div>
      </div>

      <div style={{ gap: 20, marginBottom: '1rem', display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
        <input
          type="date"
          value={openingDate && applyInverseTimeZone(openingDate).toISOString() ? applyInverseTimeZone(openingDate).toISOString().split('T')[0] : ''}
          onChange={(e) => setOpeningDate(
            prevDate => {
              if (!e.target.value) return null;
              const newDate = moment(e.target.value);
              const prevMom = prevDate?.isValid() ? moment(prevDate) : newDate

              return prevMom
                .year(newDate.year())
                .month(newDate.month())
                .date(newDate.date())
            }
          )}
          style={{
            flex: 1,
            backgroundColor: openingDate && applyInverseTimeZone(openingDate).toISOString() ? 'lightgreen' : '#eee',
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            fontSize: 14,
          }}
        />

        <input
          type="date"
          value={closingDate && applyInverseTimeZone(closingDate).toISOString() ? applyInverseTimeZone(closingDate).toISOString().split('T')[0] : ''}
          onChange={(e) => setClosingDate(
            prevDate => {
              if (!e.target.value) return null;
              const newDate = moment(e.target.value);
              const prevMom = prevDate?.isValid() ? moment(prevDate) : newDate

              return prevMom
                .year(newDate.year())
                .month(newDate.month())
                .date(newDate.date())
            }
          )}
          style={{
            flex: 1,
            backgroundColor: closingDate && applyInverseTimeZone(closingDate).toISOString() ? 'lightgreen' : '#eee',
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            fontSize: 14,
          }}
        />
      </div>

      { (closingDate || openingDate) && <div style={{ gap: 20, marginBottom: '1rem', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <button
          onClick={() => setOpenOpeningDateDialog(true)}
          style={{
            flex: 1,
            backgroundColor: openingDate && applyInverseTimeZone(openingDate).toISOString() ? 'lightgreen' : '#eee',
            color: 'black'
          }}
        >
          {openingDate && applyInverseTimeZone(openingDate).toISOString() ? openingDate.format('HH:mm') : '--:--'}
        </button>

        <button
          onClick={() => setOpenClosingDateDialog(true)}
          style={{
            flex: 1,
            backgroundColor: closingDate && applyInverseTimeZone(closingDate).toISOString() ? 'lightgreen' : '#eee',
            color: 'black'
          }}
        >
          {closingDate && applyInverseTimeZone(closingDate).toISOString() ? closingDate.format('HH:mm') : '--:--'}
        </button>
      </div> }

      {
        (closingDate || openingDate) && (
          <div style={{ display: 'flex', gap: 20, flexDirection: 'row', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                setOpeningDate(null);
              }}
              style={{
                flex: 1,
                backgroundColor: '#eee',
                color: (openingDate === null) ? '#aaa' : 'black'
              }}
              disabled={openingDate === null}
            >
              Esborra obriment
            </button>

            <button
              onClick={() => {
                setClosingDate(null);
              }}
              style={{
                flex: 1,
                backgroundColor: '#eee',
                color: (closingDate === null) ? '#aaa' : 'black'
              }}
              disabled={closingDate === null}
            >
              Esborra tancament
            </button>
          </div>
        )
      }

      {
        ((!closingDate || closingDate.isAfter(moment())) && !isNew) &&
        <button
          onClick={() => {
            setClosingDate(moment());
          }}
          style={{
            cursor: 'pointer',
            width: '100%',
            fontSize: 16,
          }}
        >
          Tanca el formulari ara
        </button>
      }

      <button
        onClick={() => setRequired(prev => !prev)}
        style={{
          cursor: 'pointer',
          marginTop: '1rem',
          width: '100%',
          fontSize: 16,
          backgroundColor: '#eee',
          color: 'black'
        }}
      >
        {
          required ? <><input type="checkbox" checked disabled /> El formulari és obligatori</> :
          <><input type="checkbox" checked={false} disabled /> El formulari no és obligatori</>
        }
      </button>

        <button
          onClick={() => setHidden(prev => !prev)}
          style={{
            cursor: 'pointer',
            marginTop: '1rem',
            width: '100%',
            fontSize: 16,
            backgroundColor: '#eee',
            color: 'black'
          }}
        >
          {
            hidden ? <><input type="checkbox" checked={false} disabled /> El formulari està ocult</> :
            <><input type="checkbox" checked={true} disabled /> El formulari és visible</>
          }
        </button>

        { elements.length > 0 && <ModeChanger modeReorder={modeReorder} setModeReorder={setModeReorder} /> }

      { modeReorder === false && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>{ElementsToEdit}</div> }
      { modeReorder === true && <ModeReorder elements={elements} order={order} setOrder={setOrder} /> }

      { 
        modeReorder === false && 
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 25 }}>
          <button
            onClick={() => setClosedDuplicateFormPopup(false)}
            style={{
              cursor: 'pointer',  
              marginBottom: '1rem',
              width: '100%',
              fontSize: 14,
            }}
          >
            + Importar preguntes d'un altre formulari
          </button>
        </div>
      }

      <AddElementButtons addElement={addElement} elements={elements} />
      { showLoadSaveButtons && <LoadSaveButtons saveForm={saveForm} loadForm={loadForm} /> }
      { !isNew && <button className='delete-button' onClick={deleteForm}>Esborra el formulari</button> }
    </div>
  );
};

const ModeChanger = ({ modeReorder, setModeReorder }) => {
    return (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
            <button style={{ width: '100%', fontSize: 14 }} onClick={() => setModeReorder(!modeReorder)}>
                { modeReorder === false ? "Edita l'ordre" : 'Fet' }
            </button>
        </div>
    )
}

const ModeReorder = ({ elements, order, setOrder }) => {
    const orderIndexes = [
        ...order
            .map(id => elements.findIndex(element => element.id === id))
            .filter(index => index !== -1),

        ...elements
            .filter(element => !order.includes(element.id))
            .map((_, index) => index + order.length)
    ];

    const handleReorder = (newOrder) => {
        setOrder(
            newOrder
                .map(index => elements[index].id)
        )
    };

    const readableType = (type) => {
        switch (type) {
            case 'multiple-choice': return 'Única opció';
            case 'checkbox': return 'Múltiples opcions';
            case 'short-answer': return 'Resposta curta';
            case 'paragraph': return 'Resposta llarga';
            case 'text': return 'Text';
            case 'image-upload': return 'Penjar imatge';
            case 'image': return 'Imatge';
            case 'copiable-text': return 'Text per copiar';
            case 'resum-pagaments': return 'Resum pagaments';
            case 'ticket': return 'Pagament';
            default: return 'Desconegut';
        }
    };

    return elements.length > 0 &&
        <List
            rowHeight={150}
            order={orderIndexes}
            onReOrder={handleReorder}
        >{
            elements.map((element, index) =>
                <List.Item
                    key={index}
                    as={PreguntaItem}
                    dragHandle={<DragHandle/>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 3 }}>
                    <div style={{ flex: 1 }}>
                      <span className='type-label'>{readableType(element.type)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', flex: 2 }}>
                      <div style={{ flex: 2, fontSize: 18 }}>{
                          element.type === 'multiple-choice' ? element.content.question :
                          element.type === 'checkbox' ? element.content.question :
                          element.type === 'short-answer' ? element.content.question :
                          element.type === 'paragraph' ? element.content.question :
                          element.type === 'text' ? element.content :
                          element.type === 'image' ? 'Imatge' :
                          element.type === 'image-upload' ? element.content.question :
                          element.type === 'copiable-text' ? element.content.question :
                          element.type === 'resum-pagaments' ? 'Resum dels pagaments' :
                          element.type === 'ticket' ? element.content.question :
                          null
                      }</div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', flex: 2 }}>
                        {
                            element.type === 'multiple-choice' ? element.content.options.map(option => <span className='option-label'>{option}</span>) :
                            element.type === 'checkbox' ? element.content.options.map(option => <span className='option-label'>{option}</span>) :
                            element.type === 'ticket' ? element.content.options.map(option => <span className='option-label'>{option}</span>) :
                            null
                        }
                      </div>
                    </div>
                  </div>
                </List.Item>
            )
        }</List>
}

const TitleInput = ({ title, handleTitleChange }) => {
  const onChange = (event) => handleTitleChange(event.target.value);

  return (
    <div className="form-editor-title">
      <input value={title} type="text" placeholder="Títol del formulari" onChange={onChange} />
    </div>
  );
};

const DescriptionInput = ({ description, handleDescriptionChange }) => {
  const onChange = (event) => handleDescriptionChange(event.target.value);

  return (
    <div className="form-editor-description">
      <textarea
        rows="3"
        placeholder="Descripció del formulari"
        onChange={onChange}
        value={description}
      >
      </textarea>

      <p style={{ fontSize: 12, fontStyle: 'italic' }}>
        Podeu posar <b>*negretes*</b> i <i>_cursives_</i> posant asteriscs o guions baixos al voltant del text.
      </p>
    </div>
  );
};

const AddElementButtons = ({ addElement, elements }) => {
    const hasTickets = elements
      ?.filter(element => element.type === 'ticket')
      ?.length
      > 0

    return (
      <>
      <h3>📝 Respostes per respondre</h3>
      <div className="add-element-buttons">
        <button onClick={() => addElement('multiple-choice')}>
            + Opció única
        </button>
        <button onClick={() => addElement('checkbox')}>
            + Vàries opcions
        </button>
        <button onClick={() => addElement('short-answer')}>
            + Resposta curta
        </button>
        <button onClick={() => addElement('paragraph')}>
            + Resposta llarga
        </button>
        <button onClick={() => addElement('image-upload')}>
            + Penjar imatge
        </button>
      </div>
      <h3>🖼️ Elements estàtics</h3>
      <div className="add-element-buttons">
        <button onClick={() => addElement('text')}>
            + Text
        </button>
        <button onClick={() => addElement('image')}>
            + Imatge
        </button>
        <button onClick={() => addElement('copiable-text')}>
            + Text per copiar
        </button>
      </div>
      <h3>💰 Pagaments</h3>
      { !hasTickets && <p style={{ fontSize: 12, fontStyle: 'italic' }}>Per afegir resum de pagaments i comprovants, crea un pagament abans.</p> }
      <div className="add-element-buttons">
        <button onClick={() => addElement('ticket')}>
            + Pagament
        </button>
        <button disabled={!hasTickets} onClick={() => addElement('resum-pagaments')}>
            + Resum pagaments
        </button>
        <button disabled={!hasTickets} onClick={() => addElement('comprovant-upload')}>
            + Penjar comprovant
        </button>
      </div>
      </>
    );
  };  

  const LoadSaveButtons = ({ saveForm, loadForm }) => {
    return (
      <div className="fixed-load-save-buttons">
        <button onClick={saveForm} title="Save">
          💾
        </button>
      </div>
    )

    // return (
    //   <div className="load-save-buttons">
    //     <button onClick={saveForm} title="Save">
    //       💾 Guarda el formulari
    //     </button>
    //     <button onClick={loadForm} title="Reset">
    //       🔄 Torna a començar
    //     </button>
    //   </div>
    // );
  };  

const FormElement = ({ element, updateElement, removeElement, errors, selectedEvent }) => {
  const ComponentMap = {
    'multiple-choice': MultipleChoiceQuestion,
    checkbox: CheckboxQuestion,
    'short-answer': ShortAnswerQuestion,
    paragraph: ParagraphQuestion,
    'image-upload': ImageUploadQuestion,
    'copiable-text': CopiableTextQuestion,
    'resum-pagaments': ResumPagamentsQuestion,
    ticket: TicketQuestion,
    text: TextElement,
    image: ImageElement,
  };

  const Component = ComponentMap[element.type];

  const toggleRequired = () => {
    // Ticket is always required 
    if (element.type === 'ticket') updateElement({ ...element, required: true });
    else updateElement({ ...element, required: !element.required });
  };

  return (
    <div className='form-element'>
      {
        !['text', 'image', 'copiable-text', 'resum-pagaments'].includes(element.type) &&
        <div
          style={{
            marginBottom: 15,
            float: 'right',
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={element.required}
              onChange={toggleRequired}
            />
            Obligatòria
          </label>
        </div>
      }

      <Component
        element={element}
        updateElement={updateElement}
        removeElement={removeElement}
        errors={errors}
        selectedEvent={selectedEvent}
      />
    </div>
  );
};

export default FormEditor;