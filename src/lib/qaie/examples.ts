export interface ExampleCircuit {
  id: string;
  label: string;
  description: string;
  qasm: string;
}

export const EXAMPLES: ExampleCircuit[] = [
  {
    id: "redundante",
    label: "Clifford+T redundante (4 qubits)",
    description: "Portas inversas e rotações separadas por portas que comutam.",
    qasm: `OPENQASM 2.0;
include "qelib1.inc";
qreg q[4];
h q[0];
t q[1];
cx q[0],q[1];
t q[0];
cx q[2],q[3];
t q[0];
h q[2];
h q[2];
cx q[0],q[1];
tdg q[1];
rz(pi/4) q[3];
s q[3];
cx q[1],q[2];
x q[2];
cx q[1],q[2];
x q[2];
h q[3];
x q[3];
h q[3];
z q[3];
`,
  },
  {
    id: "cnot-invertido",
    label: "CNOTs com conjugação de Hadamard (3 qubits)",
    description: "Padrões H·CX·H que se reduzem com inversão de CNOT e cancelamentos.",
    qasm: `OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
h q[0];
h q[1];
cx q[0],q[1];
h q[0];
h q[1];
cx q[1],q[0];
t q[2];
cz q[1],q[2];
h q[2];
cx q[1],q[2];
h q[2];
tdg q[2];
swap q[0],q[2];
swap q[0],q[2];
`,
  },
  {
    id: "toffoli-cascata",
    label: "Cascata de Toffoli com rotações (5 qubits)",
    description: "Toffolis repetidas e rotações arbitrárias que se fundem.",
    qasm: `OPENQASM 2.0;
include "qelib1.inc";
qreg q[5];
ccx q[0],q[1],q[2];
rz(0.3) q[3];
ccx q[0],q[1],q[2];
cx q[3],q[4];
rz(0.2) q[3];
rx(0.5) q[4];
ccx q[2],q[3],q[4];
rx(-0.5) q[4];
ccx q[2],q[3],q[4];
t q[0];
t q[0];
`,
  },
];
