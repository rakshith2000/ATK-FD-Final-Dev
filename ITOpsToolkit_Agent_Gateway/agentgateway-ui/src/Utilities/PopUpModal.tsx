import React from "react";
import { Button, Modal } from "react-bootstrap";

export const PopUpModal = ({show, onHide, modalMessage }) => {
  return (
    <>
      <Modal show={show}   onHide={onHide} >
       
        <Modal.Body className="mt-1 text-center modal_popup text-white">
          <div dangerouslySetInnerHTML = {{__html:modalMessage}} />
        </Modal.Body>
        <Modal.Footer  className="justify-content-center border-0 footer_size">
          <Button className="footer_size button_color" onClick={onHide}>Ok</Button>
        </Modal.Footer>{" "}
      </Modal>
    </>
  );
};
