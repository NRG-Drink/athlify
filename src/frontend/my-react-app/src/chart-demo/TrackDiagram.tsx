import {
  Bar,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from "recharts";
import type { ChartDate, TrackData } from "./track-data";
import type { ReactNode } from "react";

export default function TrackDiagram(props: { data: ChartDate[] }) {
  const uniqueYears = [
    ...new Set(
      props.data.map((d) => {
        const date = new Date(d.formattedDate);
        return `${date.getFullYear()}-${date.getMonth()}`;
      }),
    ),
  ];

  const formatMonth = (date) =>
    new Date(date).toLocaleString("default", { month: "short" });

  const renderQuarterTick = (tickProps: XAxisTickContentProps): ReactNode => {
    const {
      x: xProp,
      y: yProp,
      payload,
      width: widthProp,
      visibleTicksCount,
    } = tickProps;
    const x = Number(xProp);
    const y = Number(yProp);
    const width = Number(widthProp);
    const { value, offset = 0 } = payload;
    const date = new Date(value);
    const month = date.getMonth();
    const quarterNo = Math.floor(month / 3) + 1;

    if (month % 3 === 1) {
      return (
        <text
          x={x + width / visibleTicksCount / 2 - offset}
          y={y}
          textAnchor="middle"
        >{`Q${quarterNo}`}</text>
      );
    }

    const isLast = month === 11;

    if (month % 3 === 0 || isLast) {
      const pathX =
        Math.floor(
          isLast ? x - offset + width / visibleTicksCount : x - offset,
        ) + 0.5;

      return <path d={`M${pathX},${y - 4}v${-35}`} stroke="red" />;
    }
    return null;
  };

  // Example at https://recharts.github.io/en-US/examples/BarChartWithMultiXAxis/
  const renderYearTick = (
    tickProps: XAxisTickContentProps,
    height: number,
  ): ReactNode => {
    const {
      x: xProp,
      y: yProp,
      payload,
      width: widthProp,
      visibleTicksCount,
    } = tickProps;
    const x = Number(xProp);
    const y = Number(yProp);
    const width = Number(widthProp);
    const { value, offset = 0 } = payload;
    const date = new Date(value);
    const month = date.getMonth();
    const year = date.getFullYear();

    let number = uniqueYears.filter((d) => d.startsWith(`${year}-`)).length;
    let divisor = 2;
    if (number % 2 === 0) {
      number = number - 1;
      divisor = 1;
    }

    const labelNumber = Math.floor(number / 2);
    if (month % 12 === labelNumber) {
      return (
        <text
          x={x + width / visibleTicksCount / divisor - offset}
          y={y + height - 22}
          textAnchor="middle"
        >{`${year}`}</text>
      );
    }

    const isLast = month === number;
    const isFirst = month === 0;
    if (isFirst || isLast) {
      const pathX =
        Math.floor(
          isLast ? x - offset + width / visibleTicksCount : x - offset,
        ) + 0.5;
      return <path d={`M${pathX},${y + height - 22}v${-23}`} stroke="black" />;
    }

    return null;
  };

  return (
    <ComposedChart data={props.data}>
      <Tooltip />

      {/* <XAxis dataKey="formattedDate" /> */}
      <XAxis
        dataKey="formattedDate"
        tickFormatter={formatMonth}
        xAxisId="month"
        angle={-20}
        label={{ value: "Month", position: "insideLeft", offset: -50 }}
      />
      <XAxis
        dataKey="formattedDate"
        axisLine={false}
        tickLine={false}
        interval={0}
        tick={renderQuarterTick}
        height={1}
        scale="band"
        xAxisId="quarter"
        label={{ value: "Quart.", position: "insideLeft", offset: -50 }}
      />
      <XAxis
        dataKey="formattedDate"
        axisLine={false}
        tickLine={false}
        interval={0}
        tick={(props) => renderYearTick(props, 40)}
        height={40}
        scale="band"
        xAxisId="year"
        label={{ value: "Year", position: "insideLeft", offset: -50 }}
      />

      <YAxis yAxisId={"km"} orientation="left" width={"auto"} />
      <YAxis yAxisId={"m"} orientation="right" width={"auto"} />

      <Bar
        yAxisId={"km"}
        xAxisId={"month"}
        dataKey="distance"
        barSize={20}
        fill="#413ea0"
      />
      <Line
        yAxisId={"m"}
        xAxisId={"month"}
        type="monotone"
        dataKey="elevationGain"
        stroke="#ff7300"
      />
      <Line
        yAxisId={"m"}
        xAxisId={"month"}
        type="monotone"
        dataKey="tss"
        stroke="#c5c5c5"
      />
    </ComposedChart>
  );
}
