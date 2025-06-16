### beginning of compose code ###

# Determine target object, blue mug
blue_mug = self.detect("blue mug")[0]

# Determine target object, left branch

# Detect branches
branch_list = self.detect("branch")
branch_centroid_list = [np.mean(pts, axis=0)[None, :] for pts in branch_list]
branch_centroid_numpy = np.concatenate(branch_centroid_list, axis=0)

# Extract x coordinates
branch_x = branch_centroid_numpy[:, 0] # determine right or left

# Find the index of the branch with the minimum x-coordinate (leftmost)
tgt_branch_idx = np.argmin(branch_x)
tgt_branch_pts = branch_list[tgt_branch_idx]

output_var = {}
output_var["mug"] = blue_mug
output_var["branch"] = tgt_branch_pts
### end of compose code ###


### beginning of detect code ###
mug_list = self.get_obj('mug')
tgt_idx = self.find_instance_in_category(instance = 'blue mug', category = 'mug')
tgt_mug = mug_list[tgt_idx]
output_var = [tgt_mug]
### end of detect code ###


### beginning of detect code ###
branch_list = self.get_obj('branch')
output_var = branch_list
### end of detect code ###


