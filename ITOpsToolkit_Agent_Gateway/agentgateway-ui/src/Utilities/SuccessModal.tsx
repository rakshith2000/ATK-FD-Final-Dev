import React from "react";
import { Modal } from "react-bootstrap";
import success from "../../assets/success.png";

export interface SuccessModalLink {
  href?: string;
  label: React.ReactNode;
  target?: string;
  rel?: string;
}

export interface SuccessModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  message?: React.ReactNode;
  link?: SuccessModalLink;
  confirmText?: string;
  onConfirm?: () => void;
  closeButton?: boolean;
  confirmClassName?: string;
  messageClassName?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  onHide,
  title = "Success!",
  message,
  link,
  confirmText = "OK",
  onConfirm,
  closeButton = true,
  confirmClassName = "btn button_color text-light fw-bold px-4",
  messageClassName = "itsm_ticket_label fw-bold mb-3",
}) => {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else onHide();
  };

  return (
    <Modal
      backdrop={true}
      show={show}
      centered
      className="modal-narrow"
      onHide={onHide}
    >
      <div className="tech_assistshadow">
        <Modal.Header closeButton={closeButton} className="border-0" />
        <div className="text-center p-4">
          <div className="d-flex justify-content-center mb-3">
            <div className="meeting_succes_bg p-2 rounded">
              <img
                src={success}
                alt="success"
                style={{ width: "4rem", height: "4rem" }}
              />
            </div>
          </div>

          <h5 className="cardicon_color fw-bold mb-2">{title}</h5>
          {message && <p className={messageClassName}>{message}</p>}

          {link && (
            <div className="mb-3">
              <a
                href={link.href}
                target={link.target ?? "_blank"}
                rel={link.rel ?? "noopener noreferrer"}
                className="cardicon_color"
              >
                {link.label}
              </a>
            </div>
          )}

          <button className={confirmClassName} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SuccessModal;
