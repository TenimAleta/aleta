import { useRef, useState } from "react"
import { useEffect } from "react"
import { isMobile } from "react-device-detect"
import './FormEditorStyles.css'
import { fetchAPI, getSubdomain, postAPI } from "../../utils/utils"
import Popup from "../other/Popup"
import Pressable from "../other/Pressable"
import FormImageOCRReader from "./utils/FormImageOCRReader"
import useScheduler from "./utils/useScheduler"
import PopupFormImage from "./components/PopupFormImage"

const COLLA = getSubdomain()

function FormImage({ id, evId, user, width='auto', height='auto' }) {
  const [imgURL, setImgURL] = useState(null)

  useEffect(() => {
    fetchAPI(`/form_image_url/${evId}/${id}/${user}`, (res) => {
      fetch(res?.url)
        .then(res => res.text())
        .then(url => url.indexOf('Error') > 0 ? false : url)
        .then(setImgURL)
    }, false, false)
  }, [id, evId, user])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={
          imgURL === null ? 'https://retchhh.files.wordpress.com/2015/03/loading1.gif' :
          !imgURL ? "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png" :
          imgURL
        }
        alt="Carregant..."
        width={width}
        height={height}
      />
    </div>
  )
}

function FormImagePreview({ noVe, showNoVincs, setFocusedResponseInfo, setModalIsClosed, id, evId, user, name, recognize, showRecogintion, response, form, element, statusPagaments, setStatusPagaments, socket }) {
  const [imgURL, setImgURL] = useState(null)

  useEffect(() => {
    fetchAPI(`/form_image_url/${evId}/${id}/${user}`, (res) => {
      fetch(res?.url)
        .then(res => res.text())
        .then(url => url.indexOf('Error') > 0 ? false : url)
        .then(setImgURL)
    }, false, false)
  }, [id, evId, user])

  const openModal = () => {
    setFocusedResponseInfo({
      name,
      user,
      response,
      element,
    })

    setModalIsClosed(false);
  }

  const closeModal = () => {
    setModalIsClosed(true);
  }

  return !(!showNoVincs && noVe) && (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FormImageOCRReader
          imgURL={imgURL}
          showRecogintion={showRecogintion}
          recognize={recognize}
          openModal={openModal}
        >
          <img
            src={
              imgURL === null ? 'https://i.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.webp' :
              !imgURL ? "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png" :
              imgURL
            }
            alt="Sense imatge"
            width={100}
            height={100}
            style={{
              objectFit: 'cover',
              borderRadius: 10,
              // filter: showRecogintion ? 'blur(5px)' : 'none',
            }}
          />
        </FormImageOCRReader>
        <div
          style={{
            width: 100,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 5,
          }}
        >
          <div
            style={{
              fontSize: 12,
              backgroundColor:
                noVe ? 'rgb(255, 168, 168)' :
                (imgURL !== null && !imgURL) ? 'rgb(255, 220, 168)' :
                'transparent',
              borderRadius: 5,
              padding: 5,
            }}
          >
            {name}
          </div>
        </div>
      </div>
      {
        element?.isComprovant === true && (
          <BotonsHaPagat
            maxWidth={100}
            response={response}
            form={form}
            element={element}
            statusPagaments={statusPagaments}
            setStatusPagaments={setStatusPagaments}
            user={user}
            socket={socket}
          />
        )
      }
    </>
  )
}

export function BotonsHaPagat({ maxWidth, user, response, form, element, statusPagaments, setStatusPagaments, socket }) {
  const paidTickets = form.elements
    .filter(element => element.type === 'ticket')
    .filter(element => response[element.id] === 0)

  const statusTickets = paidTickets.reduce((acc, ticket) => {
    const statusOfUser = statusPagaments?.[ticket.id]?.find(status => parseInt(status['casteller-id']) === parseInt(user));
    return { ...acc, [ticket.id]: statusOfUser?.status };
  }, {});

  const colorByStatus = (status) => {
    switch (status) {
      case 'Entregat':
        return '#6BA8D9';
      case 'Pagat':
        return '#68C285';
      case 'Demanat':
        return '#E69C55';
      case 'No demanat':
        return '#F27171';
      default:
        return '#eee';
    }
  }

  const set2Pagat = (prodId) => {
    const statusOfUser = statusPagaments?.[prodId]?.find(status => parseInt(status['casteller-id']) === parseInt(user));
    const status = statusOfUser?.status;

    if (status === 'Demanat' || status === 'No demanat') {
      socket.emit('.set_pagament_status', user, prodId, 'Pagat');

      setStatusPagaments(prev => ({
        ...prev,
        [prodId]: prev[prodId].map(status => parseInt(status['casteller-id']) === parseInt(user) ? { ...status, status: 'Pagat' } : status)
      }))
    } else if (status === 'Pagat') {
      socket.emit('.set_pagament_status', user, prodId, 'Demanat');

      setStatusPagaments(prev => ({
        ...prev,
        [prodId]: prev[prodId].map(status => parseInt(status['casteller-id']) === parseInt(user) ? { ...status, status: 'Demanat' } : status)
      }))
    }
  }

  return paidTickets.length > 0 && (
    <div style={{ maxWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 5, gap: 5, }}>
      {
        paidTickets.map((ticket, index) => (
          <Pressable onClick={() => set2Pagat(ticket.id)} key={index} style={{ display: 'flex', flexDirection: 'column', padding: 5, borderRadius: 5, backgroundColor: colorByStatus(statusTickets?.[ticket.id]) }}>
            <div style={{ display: 'flex', gap: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ fontSize: 10, cursor: 'pointer' }}>
                {
                  ['No demanat', 'Demanat'].includes(statusTickets?.[ticket.id]) ? '+' :
                  '✓'
                }
              </div>
              <div style={{ fontSize: 10, cursor: 'pointer' }}>{ticket.content.question}</div>
              <div style={{ fontSize: 10, cursor: 'pointer' }}>{ticket.price}€</div>
            </div>
          </Pressable>
        ))
      }
    </div>
  )
}

function openGoogleSheet(url) {
  // Create an anchor element
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  // Add the link to the document
  document.body.appendChild(link);

  // Simulate a click on the link
  link.click();

  // Remove the link from the document
  document.body.removeChild(link);
}

const ShareExcel = ({ socket, selectedEvent, emailList, setEmailList, sendToExcel, responses, excelUrl, loadingExcel, form }) => {
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && !emailList.includes(email)) {
      setEmailList([...emailList, email]);
      setEmail('');

      socket.emit('.share_google_sheet', selectedEvent, [email])
    }
  };

  const styles = {
    main_btn: {
      width: '100%',
      marginBottom: '1rem',
    },
    success_btn: {
      width: '100%',
      backgroundColor: '#28a745',
      paddingLeft: 40,
      paddingRight: 40,
    },
    secondary_button: {
      width: '100%',
      marginBottom: '1rem',
      backgroundColor: '#ccc',
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      borderRadius: '7px',
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto',
    },
    form: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '1rem',
      width: '100%',
    },
    input: {
      flex: 1,
      marginRight: '0.5rem',
      padding: '0.5rem',
      minWidth: '60%',
      width: '100%',
    },
    button: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      minWidth: '30%',
      width: '100%',
      fontSize: '0.7rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ul: {
      listStyleType: 'none',
      paddingLeft: 0,
      width: '100%',
    },
    li: {
      marginBottom: '0.3rem',
      textAlign: 'center',
      backgroundColor: '#ffc107',
      color: 'white',
      padding: '0.25rem',
      borderRadius: '4px',
      fontSize: '0.85rem',
    },
    '@media (max-width: 576px)': {
      form: {
        flexDirection: 'column',
      },
      input: {
        marginRight: 0,
        marginBottom: '0.5rem',
      },
      button: {
        minWidth: 'auto',
      },
    },
  };
  
  useEffect(() => {
    socket.emit('.request_shared_emails', selectedEvent);

    socket.on('.google_sheet_shared', () => socket.emit('.request_shared_emails', selectedEvent));

    socket.on('.shared_emails', (emails) => {
      setEmailList(emails);
    });

    return () => {
      socket.off('.shared_emails');
      socket.off('.google_sheet_shared');
    }
  }, [selectedEvent, excelUrl, responses, form]);

  return form && responses && responses.length > 0 && (
    <div style={styles.container}>
      <div>
        {
          excelUrl && (
            <button style={styles.success_btn} onClick={() => openGoogleSheet(excelUrl)}>
              Obre a Google Sheets
            </button>
          )
        }
      </div>
      <div>
        <h3>Comparteix el formulari</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="El teu correu electrònic"
            required
          />
          <button type="submit" style={styles.button}>
            Comparteix
          </button>
        </form>
        <ul style={styles.ul}>
          {emailList.map((email, index) => (
            <li key={index} style={styles.li}>
              {email}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Summary = ({ showRecogintion, setShowRecogintion, recognize, assistenciesEvent, statusPagaments, setStatusPagaments, selectedEvent, guestMotes, form, responses, userIds, castellersInfo, setFilterText, socket }) => {
  const [showNoVincs, setShowNoVincs] = useState(true);
  
  const filterOutNoVincs = (userId) => {
    return assistenciesEvent
      ?.find(assist => parseInt(assist.user) === parseInt(userId))
      ?.assistencia === 'No vinc' ? false : true;
  }

  const filterInNoVincs = (userId) => {
    return assistenciesEvent
      ?.find(assist => parseInt(assist.user) === parseInt(userId))
      ?.assistencia === 'No vinc' ? true : false;
  }

  const totalPaidPerResponse = (response) => {
    const tickets = form
      .elements
      .filter(element => element.type === 'ticket')

    const totalPaid = tickets
      .filter(ticket => response[ticket.id] === 0)
      .map(ticket => ticket.price)
      .map(price => parseFloat(price))
      .reduce((a, b) => a + b, 0)

    return totalPaid
  }
  
  const summarizeMultipleChoice = (element) => {
    const summary = Array.from({ length: element.content.options.length }, () => ({
      vincs: 0,
      noVincs: 0,
    }));    

    responses.forEach((response, k) => {
      const choice = response[element.id];
      if (choice !== undefined) {
        if (filterInNoVincs(userIds[k])) {
          ++summary[choice].noVincs
        } else {
          ++summary[choice].vincs
        }
      }
    });
    return summary;
  };

  const summarizeCheckbox = (element) => {
    const summary = Array.from({ length: element.content.options.length }, () => ({
      vincs: 0,
      noVincs: 0,
    }));
    
    responses.forEach((response, k) => {
      const checkedOptions = response[element.id];
      if (checkedOptions) {
        Object.entries(checkedOptions).forEach(([index, isChecked]) => {
          if (isChecked) {
            if (filterInNoVincs(userIds[k])) {
              ++summary[index].noVincs
            } else {
              ++summary[index].vincs
            }
          }
        });
      }
    });
    return summary;
  };  

  const fillAndGo = (text) => {
    setFilterText(text);
    document.getElementById('respostes-anchor').scrollIntoView({ behavior: 'smooth' });
  }

  const getShortName = (userId) =>
    !(userId in castellersInfo) ? null :
    castellersInfo[userId]?.mote ? castellersInfo[userId].mote :
    `${castellersInfo[userId].nom} ${castellersInfo[userId].cognom}`;

  const getShortNamesForOption = (element, optionIndex) => {
    return responses
      .map((response, index) => {
        const userId = userIds[index];
        const shortName = getShortName(userId) || guestMotes[index] || 'VISITANT'
        const question_response = response[element.id];
        return { userId, shortName, question_response };
      })
      .filter(({ question_response }) => {
        if (element.type === 'checkbox') {
          return question_response && question_response[optionIndex];
        } else if (element.type === 'multiple-choice' || element.type === 'ticket') {
          return question_response === optionIndex;
        } else {
          return false;
        }
      })
      // .map(({ userId, shortName }) => shortName)
      .sort((a, b) => a.shortName.localeCompare(b.shortName))
  };    

  const [uncollapsedComponents, setUncollapsedComponents] = useState([]);
  const [clickedOptions, setClickedOptions] = useState([]);
  const [visibleCount, setVisibleCount] = useState({});

  const toggleShortNamesVisibility = (elementId, optionIndex) => {
    const optionKey = `${elementId}-${optionIndex}`;
    if (clickedOptions.includes(optionKey)) {
      setClickedOptions(clickedOptions.filter((key) => key !== optionKey));
    } else {
      setClickedOptions([...clickedOptions, optionKey]);
    }
  };  

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text, id) => {
    async function copyToClipboardInternal(text) {
      if (navigator.clipboard) {
        // Use Clipboard API
        await navigator.clipboard.writeText(text)
      } else if (document.queryCommandSupported("copy")) {
        // Fallback to older `execCommand` method
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          console.log("Text copied to clipboard.");
        } catch (err) {
          console.error("Error copying text to clipboard: ", err);
        } finally {
          document.body.removeChild(textarea);
        }
      } else {
        console.error("Copy to clipboard is not supported in your browser.");
      }
    }
    
    try {
      await copyToClipboardInternal(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copiableText = (element) => {
    if (element.type === 'short-answer') {
      return (
        '*' +
        element.content.question +
        '*' +
        '\n\n' +
        responses
          .map((response, index) => [userIds[index], guestMotes[index], response[element.id]])
          .filter(([userId, mote, response]) => response)
          .map(([userId, mote, response]) => `\t${getShortName(userId) || mote || 'VISITANT'}: "${response.trim()}"`)
          .join('\n\n')
      )
    } else if (element.type === 'paragraph') {
      return (
        '*' +
        element.content.question +
        '*' +
        '\n\n' +
        responses
          .map((response, index) => [userIds[index], response[element.id]])
          .filter(([userId, mote, response]) => response)
          .map(([userId, mote, response]) => `\t${getShortName(userId) || mote || 'VISITANT'}: "${response.trim().replace(/\n/g, ' ')}"`)
          .join('\n\n')
      )
    } else if (element.type === 'multiple-choice' || element.type === 'ticket') {
      return (
        '*' +
        element.content.question +
        '*' +
        '\n\n' +
        element.content.options
          .map((option, index) => [option, getShortNamesForOption(element, index).filter(({ userId }) => showNoVincs || filterOutNoVincs(userId)).map(({ shortName }) => shortName)])
          .filter(([option, shortNames]) => shortNames.length > 0)
          .map(([option, shortNames]) => `\t${option} (${shortNames.length})`) // \n\t\t- ${shortNames.join('\n\t\t- ')}`)
          .join('\n')
      )
    } else if (element.type === 'checkbox') {
      return (
        '*' +
        element.content.question +
        '*' +
        '\n\n' +
        element.content.options
          .map((option, index) => [option, getShortNamesForOption(element, index).filter(({ userId }) => showNoVincs || filterOutNoVincs(userId)).map(({ shortName }) => shortName)])
          .filter(([option, shortNames]) => shortNames.length > 0)
          .map(([option, shortNames]) => `\t${option} (${shortNames.length})`) // \n\t\t- ${shortNames.join('\n\t\t- ')}`)
          .join('\n')
      )
    } else {
      return '';
    }
  }

  const copyAllResponses = () => {
    // First get all the text
    const title_text = '*' + form.title.toUpperCase() + '*';

    const elements_text = form.elements
      .filter((element) => copiableText(element) !== '')
      .map((element) => copiableText(element))
      .join('\n\n');
      
    const full_text = title_text
      + (form.elements.length > 0 ? '\n\n' : '\n\n')
      + elements_text;

    // Then copy it
    copyToClipboard(full_text)
  }

  const excludePeopleThatDontPay = (response, element) => {
    const userDoesntPay = totalPaidPerResponse(response) === 0;
    const elementIsComprovant = element?.isComprovant === true;

    return elementIsComprovant && userDoesntPay ? false : true;
  }

  const [formImageModalIsClosed, setFormImageModalIsClosed] = useState(true);
  const [focusedResponseInfo, setFocusedResponseInfo] = useState(null);

  useEffect(() => {
    if (formImageModalIsClosed) {
      setFocusedResponseInfo(null);
    }
  }, [
    formImageModalIsClosed,
  ])

  const statusOfTickets = (response, user) => form.elements
    .filter(element => element.type === 'ticket')
    .filter(element => response[element.id] === 0)
    .map(ticket => statusPagaments?.[ticket.id]?.find(status => parseInt(status['casteller-id']) === parseInt(user))?.status)      

  const getOtherQuestionsArray = (element) => responses
    .map((response, index) => [response, index])
    .sort((a, b) => {
      const aStatus = statusOfTickets(a[0], userIds[a[1]]);
      const bStatus = statusOfTickets(b[0], userIds[b[1]]);

      if (aStatus.includes('Pagat') && bStatus.includes('Pagat')) {
        return 0;
      } else if (aStatus.includes('Pagat')) {
        return 1;
      } else if (bStatus.includes('Pagat')) {
        return -1;
      }
    })
    .map(([response, index]) => ({
      name: getShortName(userIds[index]) || guestMotes[index] || 'VISITANT',
      user: userIds[index],
      response,
      element,
    }))
    .filter(({ response }) => excludePeopleThatDontPay(response, element))

  return (<>
    <PopupFormImage
      modalIsClosed={formImageModalIsClosed}
      setModalIsClosed={setFormImageModalIsClosed}
      evId={selectedEvent}
      form={form}
      statusPagaments={statusPagaments}
      setStatusPagaments={setStatusPagaments}
      socket={socket}

      name={focusedResponseInfo?.name}
      user={focusedResponseInfo?.user}
      element={focusedResponseInfo?.element}
      response={focusedResponseInfo?.response}

      getOtherQuestionsArray={getOtherQuestionsArray}
      setFocusedResponseInfo={setFocusedResponseInfo}
      recognize={recognize}
    />

    <div className={'responses-container'} style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ flex: 2 }}>Resum</h2>
        <label
          style={{
            flex: 1,
            fontSize: 12,
            textAlign: 'right',
          }}
        >
          <input
            type="checkbox"
            checked={showNoVincs}
            onChange={() => setShowNoVincs(prev => !prev)}
            style={{
              width: 10,
              height: 10,
            }}
          />
          Mostra les respostes de gent que no ve
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <h4>
          Total: {userIds.filter(filterOutNoVincs).length > 0 && userIds.filter(filterOutNoVincs).length}
          { showNoVincs && userIds.filter(filterOutNoVincs).length > 0 && userIds.filter(filterInNoVincs).length > 0 && ' + ' }
          <span style={{ color: 'rgb(255, 80, 80)' }}>{ showNoVincs && userIds.filter(filterInNoVincs).length > 0 && userIds.filter(filterInNoVincs).length }</span>
          &nbsp;respost{userIds.length === 1 ? 'a' : 'es'}
        </h4>

        <div style={{ alignSelf:'center' }}>
          <button onClick={copyAllResponses} style={{ backgroundColor: '#333' }}>
            {isCopied ? 'Copiat!' : 'Copiar respostes'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {
          userIds
            .filter((_, index) => uncollapsedComponents.includes('users') ? true : index < 5)
            .map((userId, index) => {
              return (
                <div
                  key={userId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 5,
                    border: '1px solid #ccc',
                    borderRadius: 5,
                    margin: 5,
                    fontSize: 12,
                    backgroundColor:
                      assistenciesEvent
                        ?.find(assist => parseInt(assist.user) === parseInt(userId))
                        ?.assistencia === 'No vinc' ? 'rgb(255, 168, 168)' :
                      'transparent',
                    display:
                      !showNoVincs && assistenciesEvent
                        ?.find(assist => parseInt(assist.user) === parseInt(userId))
                        ?.assistencia === 'No vinc' ? 'none' : 'flex'
                  }}
                >
                  <a
                    href="#respostes-anchor"
                    onClick={() => setFilterText(getShortName(userId) || guestMotes[index] || 'VISITANT')}
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'none',
                      color: 'black'
                    }}
                  >
                    {getShortName(userId) || guestMotes[index] || 'VISITANT'}
                  </a>
                </div>
              )
            })
        }

        { userIds.length > 5 && <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 5,
            border: '1px solid #ccc',
            borderRadius: 5,
            margin: 5,
            fontSize: 12
          }}
          onClick={() => setUncollapsedComponents(uncollapsedComponents.includes('users') ? uncollapsedComponents.filter((component) => component !== 'users') : [...uncollapsedComponents, 'users'])}
        >
          <span style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            {uncollapsedComponents.includes('users') ? 'Mostra menys' : `+${userIds.length - 5} més`}
          </span>
        </div> }
      </div>

      {form.elements.map((element) => {
        if (element.type === 'multiple-choice' || element.type === 'ticket') {
          const summary = summarizeMultipleChoice(element);
          const maxOfSummary = summary.map(s => s.vincs).reduce((a, b) => b > a ? b : a, 0);
          return (
            <div key={element.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <h3>{element.content.question}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {element.content.options.map((option, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      onClick={() => toggleShortNamesVisibility(element.id, index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ maxWidth: '75%' }}>
                        <input type="radio" checked={summary[index].vincs === maxOfSummary && maxOfSummary > 0} disabled={true} />
                        <a style={{ color: 'black' }} id={`#${element.id}-${option}-${index}`} href={`#${element.id}-${option}-${index}`}>
                          {option}
                        </a>
                        { element.type === 'ticket' && index === 0 ? <> ({element.price}€)</> : <></> }
                      </span>
                      <hr
                        style={{
                          flexGrow: 1,
                          borderTop: '1px solid #ccc',
                          borderColor: '#ccc',
                          marginLeft: '0.5rem',
                          marginRight: '0.5rem',
                          alignSelf: 'center',
                        }}
                      />
                      <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', color: summary[index].vincs === 0 ? '#ccc' : 'black' }}>{summary[index].vincs}</span>
                      { showNoVincs && summary[index].noVincs > 0 && <span style={{ marginLeft: '0.2rem', fontWeight: 'bold', color: 'black' }}> + </span> }
                      { showNoVincs && summary[index].noVincs > 0 && <span style={{ marginLeft: '0.2rem', fontWeight: 'bold', color: 'rgb(255, 80, 80)' }}>{summary[index].noVincs}</span> }
                    </div>

                    <div
                      style={{
                        display: getShortNamesForOption(element, index).filter(({ userId }) => showNoVincs || filterOutNoVincs(userId)).length > 0 && clickedOptions.includes(`${element.id}-${index}`) ? 'flex' : 'none',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginLeft: '2rem',
                      }}
                    >
                      {
                        getShortNamesForOption(element, index).map(({ userId, shortName }, index) => (
                          <a
                            key={index}
                            href="#respostes-anchor" 
                            onClick={() => setFilterText(shortName)}
                            style={{
                              margin: 5,
                              padding: 5,
                              borderStyle: 'solid',
                              borderWidth: 1,
                              borderColor: '#ccc',
                              borderRadius: 5,
                              fontSize: 12,
                              textDecoration: 'none',
                              color: 'black',
                              backgroundColor: assistenciesEvent
                                ?.find(assist => parseInt(assist.user) === parseInt(userId))
                                ?.assistencia === 'No vinc' ? 'rgb(255, 168, 168)' : 'transparent',
                              display:
                                !showNoVincs && assistenciesEvent
                                  ?.find(assist => parseInt(assist.user) === parseInt(userId))
                                  ?.assistencia === 'No vinc' ? 'none' : 'flex'
                            }}
                          >
                            {shortName}
                          </a>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (element.type === 'checkbox') {
          const summary = summarizeCheckbox(element);
          const maxOfSummary = summary.reduce((a, b) => b > a ? b : a, 0);
          return (
            <div key={element.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <h3>{element.content.question}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {element.content.options.map((option, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                  <div
                    onClick={() => toggleShortNamesVisibility(element.id, index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      position: 'relative',
                    }}
                  >
                    <span style={{ maxWidth: '75%' }}>
                      <input type="checkbox" checked={summary[index].vincs === maxOfSummary && maxOfSummary > 0} disabled={true} />
                      <a style={{ color: 'black' }} id={`#${element.id}-${option}-${index}`} href={`#${element.id}-${option}-${index}`}>
                        {option}
                      </a>
                    </span>
                    <hr
                      style={{
                        flexGrow: 1,
                        borderTop: '1px solid #ccc',
                        borderColor: '#ccc',
                        marginLeft: '0.5rem',
                        marginRight: '0.5rem',
                        alignSelf: 'center',
                      }}
                    />
                    <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', color: summary[index].vincs === 0 ? '#ccc' : 'black' }}>{summary[index].vincs}</span>
                    { showNoVincs && summary[index].noVincs > 0 && <span style={{ marginLeft: '0.2rem', fontWeight: 'bold', color: 'black' }}> + </span> }
                    { showNoVincs && summary[index].noVincs > 0 && <span style={{ marginLeft: '0.2rem', fontWeight: 'bold', color: 'rgb(255, 80, 80)' }}>{summary[index].noVincs}</span> }
                  </div>

                  <div
                    style={{
                      display: getShortNamesForOption(element, index).filter(({ userId }) => showNoVincs || filterOutNoVincs(userId)).length > 0 && clickedOptions.includes(`${element.id}-${index}`) ? 'flex' : 'none',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginLeft: '2rem',
                    }}
                  >
                  {
                    getShortNamesForOption(element, index).map(({ shortName, userId }, index) => (
                      <a
                        key={index} 
                        href="#respostes-anchor"
                        onClick={() => setFilterText(shortName)}
                        style={{
                          margin: 5,
                          padding: 5,
                          borderStyle: 'solid',
                          borderWidth: 1,
                          borderColor: '#ccc',
                          borderRadius: 5,
                          fontSize: 12,
                          textDecoration: 'none',
                          color: 'black',
                          backgroundColor: assistenciesEvent
                            ?.find(assist => parseInt(assist.user) === parseInt(userId))
                            ?.assistencia === 'No vinc' ? 'rgb(255, 168, 168)' : 'transparent',
                          display: 
                            !showNoVincs && assistenciesEvent
                              ?.find(assist => parseInt(assist.user) === parseInt(userId))
                              ?.assistencia === 'No vinc' ? 'none' : 'flex'
                        }}
                      >
                        {shortName}
                      </a>
                    ))
                  }
                  </div>
                </div>
                ))}
              </div>
            </div>
          );
        } else if (element.type === 'short-answer' || element.type === 'paragraph') {
          return (
            <div key={element.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <h3>{element.content.question}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {responses
                  .map((response, index) => [userIds[index], response[element.id], index])
                  .filter(([userId, response]) => response)
                  .filter(([userId, response], index) => !uncollapsedComponents.includes(element.id) && index < 3 || uncollapsedComponents.includes(element.id))
                  .sort((a, b) => {
                    const displayName = (userId) => getShortName(userId) || guestMotes[userId] || 'VISITANT';
                    return displayName(a[0]).localeCompare(displayName(b[0]));
                  })
                  .map(([userId, response, response_index], index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        position: 'relative',
                        color: assistenciesEvent
                            ?.find(assist => parseInt(assist.user) === parseInt(userId))
                            ?.assistencia === 'No vinc' ? 'rgb(255, 100, 100)' : 'black',
                        display: 
                          !showNoVincs && assistenciesEvent
                            ?.find(assist => parseInt(assist.user) === parseInt(userId))
                            ?.assistencia === 'No vinc' ? 'none' : 'flex'
                      }}
                      // onClick={() => fillAndGo(response)}
                    >
                      <span style={{ maxWidth: '75%' }}>
                        <strong>{getShortName(userId) || guestMotes[response_index] || 'VISITANT'}:</strong> <em>"{response.trim()}"</em>
                      </span>
                    </div>
                  ))
                }

                { responses.filter(r => r[element.id]).length > 3 && <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (uncollapsedComponents.includes(element.id)) {
                        setUncollapsedComponents(uncollapsedComponents.filter((id) => id !== element.id));
                      } else {
                        setUncollapsedComponents([...uncollapsedComponents, element.id]);
                      }
                    }}
                  >
                    {uncollapsedComponents.includes(element.id) ? "Mostra'n només 3" : `Mostra totes les ${responses.filter(r => r[element.id]).length} respostes`}
                  </button>
                </div> }
              </div>
            </div>
          );
        } else if (element.type === 'image-upload') {
          return (
            <div key={element.id}>
              <h3>{element.content.question}</h3>
              {
                element?.isComprovant === true && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 20, }}>
                    <p style={{ fontSize: 12, marginBottom: 20, fontStyle: 'italic' }}>
                      Pots marcar com a "pagats" els pagaments de cada persona fent click als botons.
                    </p>
                    <div
                      style={{
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => setShowRecogintion(prev => !prev)}
                      >
                        {
                          !showRecogintion ? '🪄 Llegeix' :
                          '👁️ Mostra'
                        }
                      </button>
                    </div>
                  </div>
                )
              }
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                {
                  responses
                    .map((response, index) => [response, index])
                    .sort((a, b) => {
                      const aStatus = statusOfTickets(a[0], userIds[a[1]]);
                      const bStatus = statusOfTickets(b[0], userIds[b[1]]);

                      if (aStatus.includes('Pagat') && bStatus.includes('Pagat')) {
                        return 0;
                      } else if (aStatus.includes('Pagat')) {
                        return 1;
                      } else if (bStatus.includes('Pagat')) {
                        return -1;
                      }
                    })
                    .map(([response, index]) => excludePeopleThatDontPay(response, element) && (
                      <div key={index} style={{ margin: 5 }}>
                        <FormImagePreview
                          id={element.id}
                          evId={selectedEvent}
                          user={userIds[index]}
                          name={getShortName(userIds[index]) || guestMotes[index] || 'VISITANT'}
                          recognize={recognize}
                          showRecogintion={showRecogintion}
                          setModalIsClosed={setFormImageModalIsClosed}

                          noVe={
                            assistenciesEvent
                              ?.find(assist => parseInt(assist.user) === parseInt(userIds[index]))
                              ?.assistencia === 'No vinc'
                          }
                          showNoVincs={showNoVincs}

                          setFocusedResponseInfo={setFocusedResponseInfo}

                          response={response}
                          form={form}
                          element={element}
                          statusPagaments={statusPagaments}
                          setStatusPagaments={setStatusPagaments}
                          socket={socket}
                        />
                      </div>
                    ))
                    .filter((element) => element)
                    .slice(0, (visibleCount[element.id] || 5))
                }
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {(visibleCount[element.id] || 5) < responses.filter(response => excludePeopleThatDontPay(response, element)).length && (<>
                      <button onClick={() => setVisibleCount(prev => ({ ...prev, [element.id]: (prev[element.id] || 5) + 5 }))}>
                        + Mostra'n més
                      </button>
                      <button onClick={() => setVisibleCount(prev => ({ ...prev, [element.id]: responses.length }))}>
                        + Mostra-les totes
                      </button>
                    </>)}
                    {(visibleCount[element.id] || 5) > 5 && (
                      <button onClick={() => setVisibleCount(prev => ({ ...prev, [element.id]: 5 }))}>
                        - Mostra'n menys
                      </button>
                    )}
                  </div>
              </div>
            </div>
          )
        } else {
          return null;
        }
      })}
    </div>
  </>);  
};

function FormResponses({ userInfo, socket, selectedEvent, castellersInfo, setCastellersInfo }) {
    const [form, setForm] = useState(null)
    const [responses, setResponses] = useState([])
    const [userIds, setUserIds] = useState([])
    const [assistenciesEvent, setAssistenciesEvent] = useState([])
    const [showRecogintion, setShowRecogintion] = useState(false)

    const { ready, recognize } = useScheduler();

    const guestMotes = responses.map(response => response?.mote)

    useEffect(() => {
      if (selectedEvent) fetchAPI(`/all_assistencies_event/${selectedEvent}`, data => setAssistenciesEvent(data.data))
    }, [
      selectedEvent,
    ])

    useEffect(() => {
        socket.emit('.request_form_responses', selectedEvent)
        socket.emit('.load_form', selectedEvent)
        socket.emit('.request_google_sheet_url', selectedEvent)

        socket.on('.form_responses', (res) => {
            if (res.evId === selectedEvent) {
              setResponses(Object.values(res.responses))
              setUserIds(Object.keys(res.responses))
            }
        })

        socket.on('.loaded_form', (form) => {
            if (!form.new) {
                setForm(form)
            } else {
                setForm(false)
            }
        })

        socket.on('.google_sheet_url_received', (sheetUrl) => {
          setExcelUrl(sheetUrl);
        });

        socket.on('.new_response', () => {
          socket.emit('.request_form_responses', selectedEvent)
          socket.emit('.request_google_sheet_url', selectedEvent)
        })

        return () => {
            socket.off('.form_responses')
            socket.off('.loaded_form')
            socket.off('.google_sheet_url_received')
            socket.off('.new_response')
        }
    }, [selectedEvent])

    const [statusPagaments, setStatusPagaments] = useState({})

    useEffect(() => {
      socket.on('.pagament_status_set', data => {
        const prodId = data['producte-id'];
        const userId = data['casteller-id'];
        const status = data.status;

        setStatusPagaments(prev => ({
          ...prev,
          [prodId]: (prev[prodId] || [])
            .map(statusPagament => parseInt(statusPagament['casteller-id']) === parseInt(userId) ? { ...statusPagament, status } : statusPagament)
        }))
      })
    }, [
      socket,
    ])

    useEffect(() => {
      const tickets = form
        ?.elements
        ?.filter(element => element.type === 'ticket')
        ?.map(element => element.id)

      tickets
        ?.forEach(ticket_id => {
          fetchAPI(`/pagaments/${ticket_id}`, (res) => {
            setStatusPagaments(prev => ({ ...prev, [ticket_id]: res }))
          })
        })
    }, [
      form,
      responses,
      userIds,
    ])

    const renderResponse = (element, response, user) => {
        const { id, type } = element;
    
        switch (type) {
          case 'multiple-choice':
          case 'ticket':
            return <div>
              {
                element.content.options.map((option, index) => (
                  <div key={index}>
                    <input type="radio" checked={index === response} disabled={true} />
                    { index !== response ? <span style={{ color: '#bbb' }}>{option}</span> : <strong style={{ backgroundColor: filterText.length > 0 && queryInText(option, filterText) ? 'rgb(250, 200, 152)' : 'transparent' }}>{option}</strong> }
                  </div>
                ))
              }
            </div>;

          case 'checkbox':
            return (
              <div>
                {
                    element.content.options
                        // .filter((_, index) => response[index])
                        .map((option, index) => (
                            <div key={index}>
                              <input type="checkbox" checked={response?.[index]} disabled={true} />
                              { response?.[index] ? <strong style={{ backgroundColor: filterText.length > 0 && queryInText(option, filterText) ? 'rgb(250, 200, 152)' : 'transparent' }}>{option}</strong> : <span style={{ color: '#bbb' }}>{option}</span> }
                            </div>
                        ))
                }
              </div>
            );
          case 'short-answer':
          case 'paragraph':
            if (!response) return <em>Sense resposta</em>;
            return <div style={{ border: "solid 1px black", borderRadius: 5, padding: 10, fontSize: 12, backgroundColor: 'rgb(255, 255, 230)' }}>
              <em style={{ backgroundColor: filterText.length > 0 && queryInText(response, filterText) ? 'rgb(250, 200, 152)' : 'transparent' }}>{response}</em>
            </div>;
          case 'image-upload':
            return <div>
              <FormImage
                id={id}
                evId={selectedEvent}
                user={user}
                width={200}
              />
            </div>
          default:
            return null;
        }
      };
    
      const renderResponseFull = (response, index) => {
        const confirmDeleteResponse = () => {
          const user = userIds[index];

          if (window.confirm(`Estàs segur que vols esborrar la resposta de ${response.fullName}?`)) {
            postAPI(
              `/delete_form_response`,
              { eventId: selectedEvent, userId: user, castellersInfo: castellersInfo },
              ({ error, ...res }) => {
                if (!error) {
                  // Success!
                  socket.emit('.new_response');
                }
              }
            );
          }
        }

        const assist = assistenciesEvent
          .find(assist => parseInt(assist.user) === parseInt(userIds[index]))
          ?.assistencia

        return (
          <div key={response.fullName} style={{ margin: 10, padding: 15, borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, backgroundColor: 'white' }}>
            <h2>{response?.fullName}</h2>
            {form.order.map((elementId) => {
              const element = form.elements.find((el) => el.id === elementId);
              if (!element) return null;
              return (
                <div key={elementId}>
                  <h3>{element.content.question}</h3>
                  {renderResponse(element, response[elementId], response?.userId)}
                </div>
              );
            })}

            {
              userInfo.es_junta >= 2 &&
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 }}>
                  <button style={{ flex: 1, backgroundColor: 'rgb(255, 0, 0, 0.4)' }} onClick={confirmDeleteResponse}>Esborra resposta</button>
                </div>
            }
          </div>
        );
      }

      const handlePrev = () => {
        if (responseIdx > 0) {
          setResponseIdx(responseIdx - 1);
        }
      };
    
      const handleNext = () => {
        if (responseIdx < responses.length - 1) {
          setResponseIdx(responseIdx + 1);
        }
      };

      const handleFilterChange = (event) => {
        setFilterText(event.target.value);
      };

      const queryInText = (text, query) => {
        if (!text) return true
        const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        return normalize(text).includes(normalize(query))
      }

      const getShortName = (userId) =>
        !(userId in castellersInfo) ? null :
        castellersInfo[userId]?.mote ? castellersInfo[userId].mote :
        `${castellersInfo[userId].nom} ${castellersInfo[userId].cognom}`;


      const getFilteredResponses = () => {
        return responses
          .map((response, index) => {
            const userId = userIds[index];
            const fullName = getFullName(userId) || guestMotes[index] || 'VISITANT';
            const shortName = getShortName(userId) || guestMotes[index] || 'VISITANT';
            return { ...response, ['userId']: userId, ['fullName']: fullName, ['shortName']: shortName };
          })
          .filter((response, index) => {
            return queryInText(response.fullName, filterText)
              // || form.order.some(elementId => {
              //   const element = form.elements.find((el) => el.id === elementId);
              //   const question_response = response[elementId];

              //   if (element.type === 'short-answer' || element.type === 'paragraph') {
              //     return queryInText(question_response, filterText)
              //   }
              //   else if (element.type === 'checkbox') {
              //     return question_response && Object.entries(question_response)
              //       .filter(([_, value]) => value)
              //       .map(([key, _]) => parseInt(key))
              //       .some(index => queryInText(element.content.options?.[index], filterText))
              //   }
              //   else if (element.type === 'multiple-choice') {
              //     const option_text = element.content.options?.[question_response]
              //     return queryInText(option_text, filterText)
              //   }
              //   else {
              //     return false
              //   }
              // })
          })
      };    

      const [responseIdx, setResponseIdx] = useState(0)
      const [filterText, setFilterText] = useState('');

      const getFullName = (userId) => {
        if (!(userId in castellersInfo)) return null
        const { nom, cognom, mote } = castellersInfo[userId]
        return `${nom} ${cognom} (${mote})`
      }

      const [loadingExcel, setLoadingExcel] = useState(false)
      const [excelUrl, setExcelUrl] = useState(null)

      useEffect(() => {
        if (excelUrl) { 
          setLoadingExcel(false)
        }
      }, [excelUrl])

      const sendToExcel = () => {
        const writerEmails = ['andreuhuguet@gmail.com', 'tenimaletaapp@gmail.com']
        socket.emit('.send_to_excel', { responses, userIds, form, castellersInfo, writerEmails });
        setLoadingExcel(true)
      }

      const [emailList, setEmailList] = useState([])
      const [isCopied, setIsCopied] = useState(false)

      const copied = () => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }

      return (
        <div>
            {/* {
              form && <>
                <h2>Comparteix el link del formulari a gent sense Aleta</h2>
                
                <p>La gent que no tingui l'app instal·lada pot respondre aquest formulari mitjançant la web.</p>

                <p>Sobretot, heu de vigilar que no hi hagi duplicats entre l'app i la web.</p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <a
                      href={`/f/${selectedEvent}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔗 Anar-hi
                    </a>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flex: 2,
                    }}
                  >
                    <input
                      type="text"
                      value={`https://${COLLA}.tenimaleta.cat/f/${selectedEvent}`}
                      readOnly
                    />

                    <button
                      id="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://${COLLA}.tenimaleta.cat/f/${selectedEvent}`)
                        copied()
                      }}
                    >
                      {
                        isCopied ? 'Copiat!' : 'Copia'
                      }
                    </button>
                  </div>
                </div>
              </>
            } */}

            { form && <h1>Respostes del formulari</h1> }

            <ShareExcel
              emailList={emailList}
              setEmailList={setEmailList}
              sendToExcel={sendToExcel}
              responses={responses}
              excelUrl={excelUrl}
              loadingExcel={loadingExcel}
              socket={socket}
              selectedEvent={selectedEvent}
              form={form}
            />

            { form && responses && responses.length > 0 && <>

            <Summary
              assistenciesEvent={assistenciesEvent}
              selectedEvent={selectedEvent}
              guestMotes={guestMotes}
              responses={responses}
              userIds={userIds}
              form={form}
              castellersInfo={castellersInfo}
              setFilterText={setFilterText}
              statusPagaments={statusPagaments}
              setStatusPagaments={setStatusPagaments}
              socket={socket}
              recognize={recognize}
              showRecogintion={showRecogintion}
              setShowRecogintion={setShowRecogintion}
            />

            <div id="respostes-anchor" style={{ display: 'flex', flexDirection: 'row' }}>
                <h2 style={{ flex: 1 }}>Respostes</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Filtrar per nom o resposta"
                value={filterText}
                onInput={handleFilterChange}
              />

              <button
                onClick={() => {
                  setFilterText('');
                }}
                style={{ marginLeft: '1rem' }}
              >
                Borra
              </button>
            </div>

            { filterText.length > 0 && <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1rem' }}>
              { getFilteredResponses().length > 1 && <div style={{ flex: 1, textAlign: 'center' }}>
                  <h4>{getFilteredResponses().length} castellers trobats</h4>
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                    {
                      getFilteredResponses().map((response, index) => {
                        return (
                          <a
                            key={index}
                            href="#respostes-anchor"
                            onClick={() => setFilterText(response.shortName)}
                            style={{
                              margin: 5,
                              padding: 5,
                              borderStyle: 'solid',
                              borderWidth: 1,
                              borderColor: '#ccc',
                              borderRadius: 5,
                              fontSize: 12,
                              textDecoration: 'none',
                              color: 'black',
                            }}
                          >
                            {response.shortName}
                          </a>
                        )
                      })
                    }
                  </div>
              </div> }
              { getFilteredResponses().length === 0 && <div style={{ flex: 1, textAlign: 'center' }}>
                  <h4>No hi ha cap resposta</h4>
              </div> }
            </div> }

            { filterText.length === 0 && <div style={{ display: 'flex', flexDirection: 'row' }}>
                <h3 style={{ flex: 5, alignSelf: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFullName(userIds[responseIdx])}</h3>

                <div style={{ flex: 1, textAlign: 'center', alignSelf: 'center' }}>
                  <h4>{responseIdx + 1}/{responses.length}</h4>
                </div>

                <div style={{ flex: 2, alignSelf: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={handlePrev} disabled={responseIdx === 0}>
                            &lt;
                        </button>
                        <button onClick={handleNext} disabled={responseIdx === responses.length - 1}>
                            &gt;
                        </button>
                    </div>
                </div>
            </div> }

            {filterText.length === 0 && getFilteredResponses().length > 1 && renderResponseFull(getFilteredResponses()[responseIdx], responseIdx)}
            { getFilteredResponses().length === 1 && renderResponseFull(getFilteredResponses()[0], 0) }

            </> }
        </div>
      );
}

export default FormResponses;