import React from "react";
import Tabs from "@vibaar/ui/common/Tabs";
import Reviewed from "./Reviewed";
import AwaitingReview from "./AwaitingReview";

const Review = () => {
  const tabs = ["Reviewed", "Awaiting review"];
  const tabContents = [<Reviewed key={0} />, <AwaitingReview key={1} />];

  return (
    <div>
      <div className=" -mt-[3px] ">
        <Tabs
          tabs={tabs}
          tabContents={tabContents}
          tabClass="justify-center"
        />
      </div>
    </div>
  );
};

export default Review;
