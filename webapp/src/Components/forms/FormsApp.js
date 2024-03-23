import { useEffect, useState } from "react";

import ChooseEvent from "./ChooseEvent";
import FormResponses from "./FormResponses";
import FormEditor from "./FormEditor";

import moment from "moment";
import 'moment/locale/ca';
import { applyTimeZone } from "../interface/assistencia/LlistaAssistencies"
import { fetchAPI, getSubdomain } from "../../utils/utils";
import UserInfo from "../login/UserInfo";
import Pressable from "../other/Pressable";
import { HeaderTabs } from "../interface/ProvesApp";
import { isBrowser } from "react-device-detect";

const COLLA = getSubdomain();

function Notifications({ msg, setMsg }) {
    const notifications_style = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: 50,
      backgroundColor: 'rgb(100, 180, 100)',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: 10,
      zIndex: 1000,
      flexWrap: 'wrap',
    };
    
    const [show, setShow] = useState(false);
  
    useEffect(() => {
      if (!msg) return;
      setShow(true);
    }, [msg]);
    
    useEffect(() => {
      if (show) {
        setTimeout(() => {
          setShow(false);
        }, (msg.timeout || 3000));
      } else {
        setMsg(null);
      }
    }, [show]);
  
      return show && (
          <div style={notifications_style}>
            <div
              style={{
                flexShrink: 0,
              }}
            >
              {msg?.msg}
            </div>
            <div
              style={{
                flexShrink: 0,
              }}
            >
              <a target="_blank" href={msg?.link} style={{ color: 'white' }}>
                {msg?.linkText}
              </a>
            </div>
          </div>
      )
  }  

function FormInfo({ socket, eventId, eventInfo, form, setSelectedEvent, castellersInfo }) {
  const [responses, setResponses] = useState([]);
  const [userIds, setUserIds] = useState([]);
  const [assistencies, setAssistencies] = useState([]);

  const responseAuthors = !castellersInfo ? [] : userIds
    .map(userId => castellersInfo[userId])
    .filter(author => author)
    .map(author => author.mote || `${author.nom} ${author.cognom}`)

  useEffect(() => {
    if (eventId) {
      fetchAPI(`/assistencies_event/${eventId}`, data => {
        setAssistencies(data.data)
      })
    }
  }, [eventId])

  const subgroupOptions = {
      'No confirmat': {
          color: 'orange',
          emoji: '😶'
      },
      'Vinc': {
          color: 'green',
          emoji: '✅'
      },
      'No vinc': {
          color: 'red',
          emoji: '❌'
      }
  }

  const formatDate = date =>
    applyTimeZone(date)
      .locale('ca')
      .format(`dddd, D [${ [3, 7, 9].includes(applyTimeZone(date).toDate().getMonth()) ? 'd\'' : 'de ' }]MMMM`)
      .split('')
      .map((letter, index) => index == 0 ? letter.toUpperCase() : letter)
      .join('')

  useEffect(() => {
    socket.on('.form_responses', (res) => {
      if (res.evId === eventId) {
        setResponses(Object.values(res.responses))
        setUserIds(Object.keys(res.responses))
      }
    })

    socket.emit('.request_form_responses', eventId)
  }, [eventId, form])

  const styles = {
    container: {
      marginTop: '1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#eee',
      borderRadius: 10,
      padding: '2rem'
    },
    title: {
      margin: '0',
      fontSize: '1.5rem'
    },
    date: {
      margin: '0',
      fontSize: '1.2rem',
      fontWeight: '300',
      color: '#555'
    },
    subgroupContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      width: '70%',
      marginTop: '1.2rem',
      marginBottom: '1rem'
    },
    subgroup: {
      fontSize: '1.1rem'
    },
    responses: {
      marginTop: '0.5rem',
      marginBottom: '1.5rem',
      fontSize: '1.2rem',
      fontWeight: '300',
      color: '#555'
    },
    authorList: {
      margin: '0 0 1rem',
      fontSize: '0.9rem',
      color: '#666',
      fontStyle: 'italic'
    },
    button: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      padding: '10px 20px',
      cursor: 'pointer',
      fontSize: '1rem'
    }
  };
  
  return (
    <div key={eventId} style={styles.container}>
      <h3 style={styles.title}>{eventInfo.title}</h3>
      <h4 style={styles.date}>{formatDate(eventInfo['data-esperada-inici'])}</h4>
      <div style={styles.subgroupContainer}>{
        Object.keys(subgroupOptions).map(subgroupName =>
          <span key={subgroupName} style={{ ...styles.subgroup, color: subgroupOptions[subgroupName].color }}>
            {subgroupOptions[subgroupName].emoji}&nbsp;
            {assistencies.filter(row => row.assistencia === subgroupName).length}
          </span>)
      }</div>
      <div style={styles.responses}>
        {userIds.length} respost{userIds.length !== 1 ? 'es' : 'a'}
      </div>
      <button
        style={styles.button}
        onClick={() => setSelectedEvent(parseInt(eventId))}
      >
        Ves al formulari
      </button>
    </div>
  );
   
}

function Dashboard({ forms, setForms, socket, castellersInfo, events, setSelectedEvent, showPast }) {
  const [mails, setMails] = useState([]);
  const [showMore, setShowMore] = useState(5);

  useEffect(() => {
    socket.emit('.get_default_mails');

    socket.on('.default_mails', data => {
      setMails([
        data['owner'],
        ...data['writers'],
        ...data['readers'],
      ].filter(mail => mail));
    });

    return () => {
      socket.off('.default_mails');
    };
  }, []);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    },
    mail: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '0.5rem',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    },
    deleteBtn: {
      backgroundColor: 'red',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      padding: '0.25rem 0.5rem',
      cursor: 'pointer',
    },
    addBtn: {
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      padding: '0.25rem 0.5rem',
      cursor: 'pointer',
    },
    label: {
      marginRight: '1rem',
      fontSize: '0.85rem',
    }
  };

  const isTextAMail = text => {
    const mailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return mailRegex.test(text);
  };

  const formsToShow = Object.keys(forms)
    .map(eventId => events.find(event => event.id == eventId))
    .filter(eventInfo => eventInfo)
    .filter(eventInfo => {
      const isPast = new Date(eventInfo['data-esperada-inici']) < new Date();
      return isPast === showPast;
    })

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{ marginTop: '1rem' }}>Correus amb accés a tots els formularis</h3>

      <div style={styles.container}>
        {mails.map(mail => (
          <div key={mail} style={styles.mail}>
            <div
              style={styles.label}
            >
              {mail}
            </div>
            <button
              style={styles.deleteBtn}
              onClick={() => {
                socket.emit('.remove_default_mail', mail);
              }}
            >
              Elimina
            </button>
          </div>
        ))}

        <button
          style={styles.addBtn}
          onClick={() => {
            const newMail = prompt('Introdueix el correu electrònic de la persona a afegir');
            if (newMail && isTextAMail(newMail)) {
              socket.emit('.add_default_mail', newMail);
            } else if (newMail) {
              alert('El correu introduït no és un correu vàlid');
            }
          }}
        >
          + Afegeix un correu
        </button>
      </div>

      <h2>{ showPast ? 'Formularis passats' : 'Formularis actius' }</h2>

      <div>
        {
          formsToShow
            .sort((a, b) => {
              const dateA = new Date(a['data-esperada-inici']);
              const dateB = new Date(b['data-esperada-inici']);

              if (showPast) return dateA > dateB ? -1 : 1;
              else return dateA > dateB ? 1 : -1; 
            })
            .map(eventInfo => {
              return (
                <FormInfo
                  key={eventInfo.id}
                  socket={socket}
                  eventId={eventInfo.id}
                  eventInfo={eventInfo}
                  form={forms[eventInfo.id]}
                  setSelectedEvent={setSelectedEvent}
                  castellersInfo={castellersInfo}
                />
              );
            })
            .slice(0, showMore)
        }

        { showMore < formsToShow.length && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              style={{ padding: '10px 20px' }}
              onClick={() => setShowMore(prev => prev + 5)}
            >
              Mostra'n més
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FormsApp({ socket, userInfo, castellersInfo, setCastellersInfo, ...props }) {
    const params = window.location.pathname.split('/').filter(part => part != '');
    const URLparsedSelectedEvent = parseInt(params[1]) || null

    const [events, setEvents] = useState([])
    const [selectedEvent, setSelectedEvent] = useState(URLparsedSelectedEvent)
    const [selectedDay, setSelectedDay] = useState(null)
    const [notification, setNotification] = useState(null);
    const [preview, setPreview] = useState(true);
    const [showPast, setShowPast] = useState(false);
    const [forms, setForms] = useState({});
    const [showShamelessPlug, setShowShamelessPlug] = useState(false);

    useEffect(() => {
      const visited = localStorage.getItem('fesmelacta_visited');
      if (visited) {
        setShowShamelessPlug(false);
      } else {
        setShowShamelessPlug(true);
      }
    }, [])

    const hidePlug = () => {
      setShowShamelessPlug(false);
      localStorage.setItem('fesmelacta_visited', 1);
    }

    useEffect(() => {
        if (selectedEvent) {
            window.history.replaceState({}, '', '/forms/' + selectedEvent);
        } else {
            window.history.replaceState({}, '', '/forms');
        }
    }, [selectedEvent])

    useEffect(() => {
      fetchAPI(`/get_all_forms`, setForms);
    }, []);

    useEffect(() => {
      document.title = `Formularis - Aleta`;
    }, []);

    return (
        <div
            style={{ width: '80%', paddingTop: 50, paddingBottom: 50 }}
        >
            <UserInfo castellersInfo={castellersInfo} {...props} socket={socket} userInfo={userInfo} />

            <HeaderTabs userInfo={userInfo} />

            <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                ← Tornar a la pàgina principal
            </Pressable>

            <Notifications msg={notification} setMsg={setNotification} />

            {
              !selectedEvent && isBrowser && showShamelessPlug && (
                <div style={{ backgroundColor: '#FFEEDD', padding: '5px 20px', borderRadius: 10, marginTop: 20, position: 'relative' }}>
                  <p style={{ fontSize: 14, fontStyle: 'italic' }}>
                    Ets junta? Necessites fer la transcripció d'una acta o reunió? Prova <a target="__blank" href={`https://fesmelacta.cat?ref=alt&col=${COLLA.slice(0,3)}`}>fesmelacta.cat</a>!
                  </p>
                  <span style={{ position: 'absolute', top: '5px', right: '10px', cursor: 'pointer', color: '#777' }} onClick={hidePlug}>✖</span>
                </div>
              )
            }

            <div>
                <h2>Tria un esdeveniment</h2>
                <ChooseEvent forms={forms} showPast={showPast} setShowPast={setShowPast} events={events} setEvents={setEvents} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} setSelectedDay={setSelectedDay} socket={socket} />
            </div>

            { selectedEvent && <FormResponses socket={socket} userInfo={userInfo} selectedEvent={selectedEvent} castellersInfo={castellersInfo} /> }
            { selectedEvent && <FormEditor forms={forms} events={events} userInfo={userInfo} castellersInfo={castellersInfo} selectedDay={selectedDay} preview={preview} setPreview={setPreview} socket={socket} selectedEvent={selectedEvent} notification={notification} setNotification={setNotification} /> }

            { !selectedEvent && <Dashboard forms={forms} setForms={setForms} showPast={showPast} socket={socket} events={events} castellersInfo={castellersInfo} setSelectedEvent={setSelectedEvent} /> }

            <div style={{ height: 100 }}>&nbsp;</div>
        </div>
    )
}

export default FormsApp;