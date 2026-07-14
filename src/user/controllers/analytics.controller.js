import PageViewModel from "../../models/pageview.model.js";

export const TrackPageView = async (req, res) => {
  try {
    const { path, name } = req.body;

    if (!path || !name) {
      return res.status(400).json({
        success: false,
        message: "Path and name are required",
      });
    }

    // Upsert the page view: increment viewCount if it exists, otherwise create it with viewCount: 1
    const pageView = await PageViewModel.findOneAndUpdate(
      { path },
      {
        $setOnInsert: { name },
        $inc: { viewCount: 1 },
      },
      { new: true, upsert: true, returnDocument: "after" },
    );

    return res.status(200).json({
      success: true,
      message: "Page view tracked successfully",
      data: pageView,
    });
  } catch (error) {
    console.error("Error in TrackPageView:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while tracking page view",
    });
  }
};
