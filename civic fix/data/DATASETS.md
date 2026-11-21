# Dataset register

No external dataset or pretrained weight has been downloaded into this repository.

| Dataset | Intended use | Source / licence status | Local status | Limitation |
| --- | --- | --- | --- | --- |
| RDD2022 | Road-damage detection | [official project](https://github.com/sekilab/RoadDamageDetector), terms must be accepted before import | not downloaded | annotations are damage types, not reliable severity ground truth |
| TACO | Litter detection | [official project](https://tacodataset.org/), CC BY 4.0 | not downloaded | no pothole labels |
| TrashNet | Waste classification | [official project](https://github.com/garythung/trashnet), dataset licence must be reviewed before redistribution | not downloaded | tabletop waste images are not street-garbage detection data |
| FloodNet | Flood/water imagery | [official project](https://github.com/BinaLab/FloodNet-Challenge-EARTHVISION2021), research terms must be reviewed | not downloaded | not a direct waterlogging-severity set |
| CIFAKE | synthetic-image research | [dataset card](https://huggingface.co/datasets/birdsql/cifake), licence must be verified before use | not downloaded | cannot prove an individual civic photo is AI-generated |

`ai-service/data/import_dataset.py` validates a manually downloaded source directory and writes a manifest. It never claims or silently performs a download. Real annotations, weak labels, and synthetic data must remain in separate directories.
