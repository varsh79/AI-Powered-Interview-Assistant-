import React, { useState } from 'react';
import { List, Button, Modal, Typography } from 'antd';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

function InterviewerTab() {
  const candidates = useSelector((state) => state.candidates);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const showCandidateDetails = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const closeModal = () => {
    setSelectedCandidate(null);
  };

  return (
    <div>
      <Title level={2}>Candidate List</Title>
      <List
        dataSource={candidates.filter((c) => c.finished).sort((a, b) => b.score - a.score)}
        renderItem={(candidate) => (
          <List.Item>
            <div style={{ width: '100%' }}>
              <Text strong>{candidate.profile.name || 'Unnamed Candidate'}</Text> - Score: {candidate.score.toFixed(2)}
              <Button
                type="link"
                onClick={() => showCandidateDetails(candidate)}
                style={{ marginLeft: '16px' }}
              >
                View Details
              </Button>
            </div>
          </List.Item>
        )}
      />
      <Modal
        title="Candidate Details"
        visible={!!selectedCandidate}
        onCancel={closeModal}
        footer={null}
        width={800}
      >
        {selectedCandidate && (
          <div>
            <Title level={4}>Profile</Title>
            <p>Name: {selectedCandidate.profile.name}</p>
            <p>Email: {selectedCandidate.profile.email}</p>
            <p>Phone: {selectedCandidate.profile.phone}</p>
            <Title level={4}>Chat History</Title>
            <List
              bordered
              dataSource={selectedCandidate.chatMessages}
              renderItem={(msg) => (
                <List.Item style={{ justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                  <span style={{ background: msg.sender === 'bot' ? '#f0f0f0' : '#d9f7be', padding: '8px', borderRadius: '8px' }}>
                    {msg.text}
                  </span>
                </List.Item>
              )}
              style={{ height: '300px', overflowY: 'auto' }}
            />
            <Title level={4}>Summary</Title>
            <p>{selectedCandidate.summary}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default InterviewerTab;