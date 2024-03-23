import React, { useState } from 'react';
import moment from 'moment';
import './EditableForm.css'
import { CopiableTextQuestion } from '../FormElements';
import { useEffect } from 'react';
import { fetchAPI } from '../../../utils/utils';

const EditableForm = ({ isLogged, mote, setMote, castellersInfo, formData, evId, user, socket, formValues, setFormValues, formSubmitted }) => {  
    const outdated = formData?.closingDate && moment(formData?.closingDate).isBefore(moment());
    const closeToEnding = !outdated && formData?.closingDate && moment(formData?.closingDate).isBefore(moment().add(2, 'day'));
    const notOpenYet = formData?.openingDate && moment(formData?.openingDate).isAfter(moment());
    const formDisabled = outdated || notOpenYet;

    const [nom, setNom] = useState('');
    const [cognom, setCognom] = useState('');

    const [sent, setSent] = useState(false);
    const [copiedText, setCopiedText] = useState({})

    const [isWarningAccepted, setIsWarningAccepted] = useState(false)

    const [imageURLs, setImageURLs] = useState({});

    const getImageData = async (selectedEvent, id) => {
      return new Promise((resolve, reject) => {
        fetchAPI(`/form_image_url/${selectedEvent}/${id}`, ({ elementId, url }) => {
          fetch(url)
            .then((res) => {
              if (!res.ok) reject('Error fetching image from S3');
              return res.text();
            })
            .then((data) => {
              resolve(data);
            })
            .catch((err) => {
              // Not found
              resolve(null)
            })
        }, false, false)
      });
    };

    const handleInputChange = (elementId, value, index) => {
        setFormValues((prevState) => {
          const newValues = { ...prevState };
      
          if (index !== undefined) {
            if (!newValues[elementId]) newValues[elementId] = {};
            newValues[elementId][index] = value;
          } else {
            newValues[elementId] = value;
          }
      
          return newValues;
        });
      };          
  
      const renderElement = (element) => {
        const { id, type, content } = element;
        const { question, options, text } = content;
    
        switch (type) {
          case 'image-upload':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                
                <p>Si us plau, passa la imatge a la tècnica o a la junta. Aquesta part està en desenvolupament.</p>
              </div>
            )
          case 'resum-pagaments':
            return (
              <div key={id} className="form-element-container">
                {/* <p>TODO: RESUM DE PAGAMENTS</p> */}
              </div>
            )
          case 'copiable-text':
            // Function to copy text to clipboard
            const handleCopy = () => {
              navigator.clipboard.writeText(text);

              setCopiedText(prev => ({ ...prev, [id]: true }))
              setTimeout(() => {
                setCopiedText(prev => ({ ...prev, [id]: false }))
              }, 1000)
            };

            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                <input 
                  type="text"
                  value={text}
                  readOnly={true}
                />
                <button onClick={handleCopy}>
                  {
                    copiedText?.[id] ? 'Copiat!' :
                    'Copia el text'
                  }
                </button>
              </div>
            )
          case 'multiple-choice':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                {options.map((option, index) => (
                  <label key={index} className="input-option">
                    <input 
                      type="radio"
                      name={id}
                      checked={id in formValues && formValues[id] === index}
                      onChange={() => formDisabled ? undefined : handleInputChange(id, index, undefined)}
                      disabled={formDisabled}
                    />
                    <div>
                        {option}
                    </div>
                  </label>
                ))}
              </div>
            );
          case 'ticket':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                {options.map((option, index) => (
                  <label key={index} className="input-option">
                    <input 
                      type="radio"
                      name={id}
                      checked={id in formValues && formValues[id] === index}
                      onChange={() => formDisabled ? undefined : handleInputChange(id, index, undefined)}
                      disabled={formDisabled}
                    />
                    <div>
                        {option}
                    </div>
                  </label>
                ))}
              </div>
            );
          case 'checkbox':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                {options.map((option, index) => (
                  <label key={index} className="input-option">
                    <div>
                        <input 
                        type="checkbox"
                        checked={id in formValues && formValues[id][index]}
                        onChange={() => formDisabled ? undefined : handleInputChange(id, !formValues[id]?.[index], index)}
                        disabled={formDisabled}
                        />
                    </div>
                    <div>
                        {option}
                    </div>
                  </label>
                ))}
              </div>
            );    
          case 'short-answer':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                <input 
                  type="text"
                  value={id in formValues ? formValues[id] : ''}
                  onChange={(event) => formDisabled ? undefined : handleInputChange(id, event.target.value, undefined)}
                  disabled={formDisabled}
                  placeholder='Escriu aquí la resposta...'
                />
              </div>
            );
          case 'paragraph':
            return (
              <div key={id} className="form-element-container">
                <h2>{question}</h2>
                <textarea
                  value={id in formValues ? formValues[id] : ''}
                  onChange={(event) => formDisabled ? undefined : handleInputChange(id, event.target.value, undefined)}
                  disabled={formDisabled}
                  placeholder='Escriu aquí la resposta...'
                />
              </div>
            );
          case 'image':
            getImageData(evId, id)
              .then((data) => {
                setImageURLs(prev => ({ ...prev, [id]: data }))
              })

            return (
              <div key={id} className="form-element-container">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={imageURLs?.[id]}
                    style={{
                      width: '90%',
                      borderRadius: 10,
                    }}
                  />
                </div>
              </div>
            );  
          case 'text':
            return (
              <div key={id} className="form-element-container">
                <p>{content}</p>
              </div>
            );
          default:
            return null;
        }
      };
  
    const submitForm = (e) => {
        socket.emit(
            '.submit_form',
            formValues,
            user,
            evId,
            {
                [user]: {
                    nom: nom !== '' ? nom : `VISITANT`,
                    cognom: cognom !== '' ? cognom : `VISITANT`,
                    mote: mote !== '' ? mote : `VISITANT`,
                },
                // Després, així fa override de les dades de l'usuari
                ...castellersInfo,
            }
        )

        socket.emit('.get_all_forms_submitted', user)

        setSent(true)
    };

    const elementsOrdered = formData.order ? [
      ...formData.order.map((elementId) => formData.elements.find((element) => element.id === elementId)),
      ...formData.elements.filter((element) => !formData.order.includes(element.id)),
    ] : []

    return sent ? (
        <div className="form-container">
            <div className="confirmation-container">
                <h2>S'ha enviat correctament!</h2>
                <p>{mote}, gràcies per enviar la resposta.</p>
      
                <div className="button-container">
                    <button
                      onClick={() => {
                        setSent(false); 
                        setFormValues({});
                        setMote('');
                      }}
                      className="styled-button"
                    >
                        Fes-ne una altra
                    </button>
                    
                    <button
                      onClick={() => {
                        setSent(false); 
                      }}
                      className="styled-button secondary-button"
                    >
                        Modifica la resposta
                    </button>
                </div>
            </div>
        </div>
      ) : (      
        <div className="form-container">
            <div>
                <h1>{formData.title}</h1>
                <p>{formData.description}</p>
    
                {
                  (!isLogged && !isWarningAccepted) &&
                  <div
                    style={{
                      padding: 20,
                      backgroundColor: '#eee',
                      borderRadius: 10,
                    }}
                  >
                    <em>
                      Respon millor aquest formulari des de l'app si ja tens usuari, així evitem duplicats!
                    </em>
                  </div>
                }

                {
                  (!isLogged && !isWarningAccepted) &&
                  <div className="form-element-container">
                    <div className="warning-container">
                      <button
                        onClick={() => setIsWarningAccepted(true)}
                        className="styled-button"
                        style={{
                          marginTop: -10,
                        }}
                      >
                        No tinc l'app, i ho he de respondre des de la web.
                      </button>
                    </div>
                  </div>
                }

                {
                  (isLogged || isWarningAccepted) &&
                  <div className="form-element-container">
                    <label>
                        <div>El teu nom</div>
                        <input
                            type="text"
                            value={mote}
                            onChange={(event) => setMote(event.target.value)}
                            disabled={formDisabled || isLogged}
                            placeholder="Diga'ns qui ets..."
                            style={{ fontSize: 14 }}
                        />
                    </label>
                  </div>
                }
    
                {
                  (isLogged || isWarningAccepted) && <>
                      {
                        elementsOrdered.map((element) => renderElement(element))
                      }
          
                      <div className="form-element-container">
                          <button
                            onClick={
                              formDisabled ? null :
                              submitForm
                            }
                            disabled={formDisabled}
                            className="styled-button disabled-button"
                          >
                              {
                                outdated ? 'Formulari tancat' :
                                notOpenYet ? 'Formulari no obert' :
                                formSubmitted === false ? "Enviar" :
                                "Modificar respostes"
                              }
                          </button>

                          { !formDisabled && <button
                            onClick={() => {
                              setSent(false); 
                              setFormValues({});
                              setMote('');

                              window.scrollTo(0, 0);
                            }}
                            className="styled-button secondary-button"
                          >
                              Fes-ne una altra
                          </button> }
                      </div>
                    </>
                }
            </div>
        </div>
      );
};

export default EditableForm;