// import { RechartsDevtools } from '@recharts/devtools';
import {
  Line,
  LineChart,
  XAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

// #region Sample data
const data = [
  {
    name: "Page A",
    uv: 400,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 300,
    pv: 4567,
    amt: 2400,
  },
  {
    name: "Page C",
    uv: 320,
    pv: 1398,
    amt: 2400,
  },
  {
    name: "Page D",
    uv: 200,
    pv: 9800,
    amt: 2400,
  },
  {
    name: "Page E",
    uv: 278,
    pv: 3908,
    amt: 2400,
  },
  {
    name: "Page F",
    uv: 189,
    pv: 4800,
    amt: 2400,
  },
];

// #endregion
export default function TemplateDiagram() {
  return (
    <BarChart data={data} >
      <YAxis yAxisId="left" orientation="left" width="auto" />
      <YAxis yAxisId="right" orientation="right" width="auto" />
      <XAxis dataKey="name" />
      <Tooltip />
      <CartesianGrid stroke="#f5f5f5" />
      {/* <Line type="monotone" dataKey="uv" stroke="#ff7300" yAxisId={"left"}/> */}
      {/* <Line type="monotone" dataKey="pv" stroke="#387908" yAxisId={"right"} /> */}
      <Bar dataKey="uv" fill="#ff7300" yAxisId="left" />
      <Bar dataKey="pv" fill="#387908" yAxisId="right" />
      <Legend />
    </BarChart>
  );
}
