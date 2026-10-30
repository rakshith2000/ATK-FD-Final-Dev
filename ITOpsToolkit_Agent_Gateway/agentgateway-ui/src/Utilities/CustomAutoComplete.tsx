import React from 'react';
import { FormControl, Autocomplete, TextField, Checkbox, Chip, Paper, Tooltip } from '@mui/material';
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const CustomAutoComplete = ({
  options,
  value,
  onChange,
  placeholder,
  TextFieldSx = {},
  error,
  showTooltip = {"show" : false, "range" : null},
  renderTagsStyle = {},
  limitTags = 1,
  id = "multiple-limit-tags",
  PaperStyle = {},
 ...props
}) => {

  // Function to calculate the maximum length based on the width of the dropdown
  const calculateMaxLength = (width) => {
    // Assuming each character roughly takes 8 pixels in width
    const charWidth = 11;
    return Math.floor(width / charWidth);
  };
  
  const dropdownWidth = PaperStyle["width"] ? parseInt(PaperStyle["width"], 10) : 200;
  const maxLength = calculateMaxLength(dropdownWidth);
  return (
    <FormControl variant="outlined" className="form-control_autocomplete">
      <Autocomplete
        multiple
        limitTags={limitTags}
        id={id}
        options={options?.sort()}
        value={value}
        onChange={onChange}
        disableCloseOnSelect
        getOptionLabel={(option) => option}
        renderOption={(props, option, { selected }) => (
          <li {...props} className="ps-2 pt-0  fs-card-title cursor-pointer autoCompleteHover">
            <Checkbox
              icon={<Checkbox size="small" 
                // sx={{ color: 'white' }}
                />}
              checked={selected}
              className=" me-2 pt-0"
              size={"small"}
              sx={{ width: 0, 
                // color: 'white'
               }}
            />
            <Tooltip title={option} placement="top">
              <span className="cursor-pointer text-capitalize">
                {option.length > maxLength ? `${option.substring(0, maxLength)}...` : option}
              </span>
            </Tooltip>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            InputProps={{
             ...params.InputProps,
              type: "search",
            }}
            sx={TextFieldSx}
            error={error}
          />
        )}
        renderTags={(value, getTagProps) => (
          value.map((option, index) => (
            <Chip
              label={showTooltip?.show ? <Tooltip title={option} placement="top">
              <span className="cursor-pointer text-capitalize">
                {option.length > 1 ? `${option.substring(0, showTooltip?.range)}...` : option}
              </span>
            </Tooltip> : option}
              {...getTagProps({ index })}
              size="small"
              className="text-white mx-1 mb-1 "
              deleteIcon={<FontAwesomeIcon icon={faCircleXmark} className="text-white treeview-p" />}
            />
          ))
        )}
        PaperComponent={({ children }) => (
          <Paper
            elevation={8}
            style={PaperStyle}
          >
            {children}
          </Paper>
        )}
        {...props}
      />
    </FormControl>
  );
};

export default CustomAutoComplete;
