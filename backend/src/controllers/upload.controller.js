// POST /api/v1/upload/images
const uploadImages = async (req, res, next) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded.' });
    }

    const urls = files.map((file) => {
      if (file.secure_url) return file.secure_url;
      if (file.path && file.path.startsWith('http')) return file.path;
      if (file.filename) return `/uploads/${file.filename}`;
      return file.path;
    });

    res.json({ success: true, message: `${urls.length} image(s) uploaded successfully.`, urls });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadImages };
