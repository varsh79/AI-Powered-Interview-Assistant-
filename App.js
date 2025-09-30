import React, { useState, useEffect } from 'react';
import { Tabs, Modal, Button } from 'antd';
import IntervieweeTab from './components/IntervieweeTab';
import InterviewerTab from './components/InterviewerTab';
import { useSelector, useDispatch } from 'react-redux';
import { clearCurrent } from './slices/currentSlice';

const { TabPane } = Tabs;

function App() {
  const dispatch = useDispatch();
  const current = useSelector((state) => state.current);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (current && !current.finished) {
      setShowWelcomeModal(true);
    }
  }, []); // Run only on mount

  const handleContinue = () => {
    setShowWelcomeModal(false);
    console.log('Resuming interview for', current?.profile?.name || 'unknown');
  };

  const handleStartNew = () => {
    dispatch(clearCurrent());
    setShowWelcomeModal(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Tabs defaultActiveKey="1" centered>
        <TabPane tab="Interviewee" key="1">
          <IntervieweeTab />
        </TabPane>
        <TabPane tab="Interviewer" key="2">
          <InterviewerTab />
        </TabPane>
      </Tabs>
      <Modal
        title="Welcome Back!"
        open={showWelcomeModal}
        footer={[
          <Button key="new" onClick={handleStartNew}>
            Start New
          </Button>,
          <Button key="continue" type="primary" onClick={handleContinue}>
            Continue
          </Button>,
        ]}
      >
        Unfinished interview found. Continue where you left off?
      </Modal>
    </div>
  );
}

export default App;